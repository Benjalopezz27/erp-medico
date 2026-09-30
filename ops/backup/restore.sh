#!/usr/bin/env bash
# Restore a backup into an isolated temporary PostgreSQL and validate it. Never touches the source.
# Usage: restore.sh (--latest | --name <object>) [--label auto|pre-migration] [--report file]
#                   [--keep] [--publish <host-port>]
# Needs: docker, aws, gpg. Runs on the operator host (not in the backup image).
#   --keep       leave the temporary container running (prints its name) for manual smoke tests
#   --publish N  with --keep, expose it on 127.0.0.1:N (default: no network at all)
# Env RESTORE_HOST/RESTORE_PORT/RESTORE_DB restore into an existing instance instead; refused
# when it is the configured source.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

SEL="" NAME="" LABEL=auto REPORT="" KEEP=false PUBLISH=""
while [ $# -gt 0 ]; do
  case "$1" in
    --latest) SEL=latest ;;
    --name) SEL=name NAME="${2:?--name needs a value}"; shift ;;
    --label) LABEL="${2:?}"; shift ;;
    --report) REPORT="${2:?}"; shift ;;
    --keep) KEEP=true ;;
    --publish) PUBLISH="${2:?}"; shift ;;
    *) die "unknown option $1" 2 ;;
  esac
  shift
done
[ -n "$SEL" ] || die "give --latest or --name <object>" 2
require_env BACKUP_ENV BACKUP_BUCKET BACKUP_ENCRYPTION_PASSPHRASE DB_HOST DB_NAME
DB_PORT="${DB_PORT:-5432}"

# Guard: the source database must never be a restore target.
if [ -n "${RESTORE_HOST:-}" ]; then
  if [ "$RESTORE_HOST" = "$DB_HOST" ] && [ "${RESTORE_PORT:-5432}" = "$DB_PORT" ] && [ "${RESTORE_DB:-}" = "$DB_NAME" ]; then
    die "refusing to restore over the source database ${DB_NAME}@${DB_HOST}:${DB_PORT}" 3
  fi
fi

PREFIX="${BACKUP_ENV}/${LABEL}"
WORK=$(mktemp -d)
CID=""
STATUS=failed
CHECKS_JSON="[]"
T0=$(date +%s.%N)
D_DL=0 D_DEC=0 D_RES=0 D_VER=0
elapsed() { awk -v a="$1" -v b="$(date +%s.%N)" 'BEGIN { printf "%.2f", b - a }'; }

write_report() {
  local total age=null
  total=$(elapsed "$T0")
  if [[ "$NAME" =~ ([0-9]{8})T([0-9]{6})Z ]]; then
    local d=${BASH_REMATCH[1]} t=${BASH_REMATCH[2]}
    age=$(($(date -u +%s) - $(date -u -d "${d:0:4}-${d:4:2}-${d:6:2}T${t:0:2}:${t:2:2}:${t:4:2}Z" +%s)))
  fi
  local json
  json=$(cat <<JSON
{
  "status": "$STATUS",
  "object": "${PREFIX}/${NAME}",
  "backup_age_seconds": $age,
  "size_bytes": ${SIZE:-0},
  "download_seconds": $D_DL,
  "decrypt_seconds": $D_DEC,
  "restore_seconds": $D_RES,
  "verify_seconds": $D_VER,
  "total_seconds": $total,
  "checks": $CHECKS_JSON
}
JSON
)
  echo "$json"
  [ -z "$REPORT" ] || echo "$json" >"$REPORT"
}

cleanup() {
  local rc=$?
  rm -rf "$WORK"
  if [ -n "$CID" ] && { [ "$KEEP" != true ] || [ "$STATUS" != ok ]; }; then
    docker rm -f "$CID" >/dev/null 2>&1 || true
  fi
  [ -z "$NAME" ] || write_report
  exit "$rc"
}
trap cleanup EXIT

if [ "$SEL" = latest ]; then
  NAME=$(s3 ls "s3://${BACKUP_BUCKET}/${PREFIX}/" | awk '{print $4}' |
    grep -E '^erp-medico-.*\.dump\.gpg$' | sort -t- -k4 | tail -1 || true)
  [ -n "$NAME" ] || die "no backups under ${PREFIX}/"
fi
log "restoring ${PREFIX}/${NAME}"

S=$(date +%s.%N)
s3 cp "s3://${BACKUP_BUCKET}/${PREFIX}/${NAME}" "$WORK/obj" --only-show-errors
s3 cp "s3://${BACKUP_BUCKET}/${PREFIX}/${NAME}.sha256" "$WORK/obj.sha256" --only-show-errors
SIZE=$(stat -c %s "$WORK/obj")
D_DL=$(elapsed "$S")

S=$(date +%s.%N)
EXPECTED=$(awk '{print $1}' "$WORK/obj.sha256")
ACTUAL=$(sha256sum "$WORK/obj" | awk '{print $1}')
[ "$EXPECTED" = "$ACTUAL" ] || die "checksum mismatch for ${NAME} (corrupt or incomplete object)"
gpg --batch --yes -q --pinentry-mode loopback --passphrase-fd 3 -o "$WORK/dump" -d "$WORK/obj" 3<<<"$BACKUP_ENCRYPTION_PASSPHRASE" 2>"$WORK/gpg.err" ||
  die "decrypt failed (wrong key or damaged object)"
D_DEC=$(elapsed "$S")

S=$(date +%s.%N)
if [ -n "${RESTORE_HOST:-}" ]; then
  export PGPASSWORD="${RESTORE_PASSWORD:?RESTORE_PASSWORD required with RESTORE_HOST}"
  RUN_PSQL() { pgx psql -h "$RESTORE_HOST" -p "${RESTORE_PORT:-5432}" -U "${RESTORE_USER:-postgres}" -d "$RESTORE_DB" "$@"; }
  pgx pg_restore -h "$RESTORE_HOST" -p "${RESTORE_PORT:-5432}" -U "${RESTORE_USER:-postgres}" -d "$RESTORE_DB" --no-owner <"$WORK/dump"
else
  NET=(--network none)
  [ "$KEEP" = true ] && [ -n "$PUBLISH" ] && NET=(-p "127.0.0.1:${PUBLISH}:5432")
  CID=$(docker run -d --name "erp-restore-$$" "${NET[@]}" -e POSTGRES_PASSWORD="$(head -c 18 /dev/urandom | base64 | tr -d '/+=')" \
    -e POSTGRES_DB=restore "$PG_IMAGE")
  until docker exec "$CID" pg_isready -U postgres -d restore >/dev/null 2>&1; do sleep 1; done
  sleep 2
  RUN_PSQL() { docker exec -i "$CID" psql -U postgres -d restore "$@"; }
  docker exec -i "$CID" pg_restore -U postgres -d restore --no-owner <"$WORK/dump"
fi
D_RES=$(elapsed "$S")

S=$(date +%s.%N)
ROWS=$(RUN_PSQL -X -q -v ON_ERROR_STOP=1 <verify-restore.sql) || die "validation query failed"
D_VER=$(elapsed "$S")
CHECKS_JSON="[$(awk -F'|' 'NF==3 { printf "%s{\"name\": \"%s\", \"ok\": %s, \"detail\": \"%s\"}", (n++ ? ", " : ""), $1, ($2 == "true" ? "true" : "false"), $3 }' <<<"$ROWS")]"
if grep -q '|false|' <<<"$ROWS"; then
  log "validation FAILED: $(grep '|false|' <<<"$ROWS" | cut -d'|' -f1 | paste -sd, -)"
  exit 1
fi
STATUS=ok
[ "$KEEP" = true ] && [ -n "$CID" ] && log "kept container $CID${PUBLISH:+ on 127.0.0.1:$PUBLISH (user postgres, db restore)}"
log "restore OK"
