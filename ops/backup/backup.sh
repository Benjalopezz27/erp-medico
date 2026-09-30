#!/usr/bin/env bash
# Consistent, encrypted pg_dump uploaded to an approved S3-compatible destination.
# Usage: backup.sh [--label pre-migration]
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh

LABEL=auto
if [ "${1:-}" = "--label" ]; then
  [ "${2:-}" = "pre-migration" ] || die "unsupported label '${2:-}' (only: pre-migration)" 2
  LABEL=pre-migration
fi

# Gate: never read the database or touch the network before the destination is approved.
[ "${BACKUP_DESTINATION_APPROVED:-}" = "true" ] ||
  die "destination not approved: set BACKUP_DESTINATION_APPROVED=true only after gate #1 is approved (docs/deployment/backup-gates.md)" 2
require_env DB_HOST DB_USER DB_PASSWORD DB_NAME BACKUP_ENV BACKUP_BUCKET BACKUP_ENCRYPTION_PASSPHRASE
DB_PORT="${DB_PORT:-5432}"
export PGPASSWORD="$DB_PASSWORD"

WORK=$(mktemp -d)
OK=false
on_exit() {
  local rc=$?
  rm -rf "$WORK"
  if [ "$OK" != true ]; then
    log "backup FAILED (exit $rc)"
    heartbeat fail
  fi
}
trap on_exit EXIT

heartbeat start
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
NAME="erp-medico-${BACKUP_ENV}-${STAMP}.dump.gpg"
PREFIX="${BACKUP_ENV}/${LABEL}"

log "dumping ${DB_NAME}@${DB_HOST}:${DB_PORT} (label=${LABEL})"
pgx pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner >"$WORK/dump"
[ -s "$WORK/dump" ] || die "dump is empty"
pgx pg_restore --list <"$WORK/dump" >/dev/null || die "dump is not a readable archive (incomplete?)"

log "encrypting"
gpg --batch --yes -q --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 \
  -o "$WORK/$NAME" "$WORK/dump" 3<<<"$BACKUP_ENCRYPTION_PASSPHRASE"
rm -f "$WORK/dump"
(cd "$WORK" && sha256sum "$NAME" >"$NAME.sha256")

log "uploading to s3://${BACKUP_BUCKET}/${PREFIX}/"
s3 cp "$WORK/$NAME" "s3://${BACKUP_BUCKET}/${PREFIX}/$NAME" --only-show-errors
s3 cp "$WORK/$NAME.sha256" "s3://${BACKUP_BUCKET}/${PREFIX}/$NAME.sha256" --only-show-errors
log "uploaded ${PREFIX}/${NAME} ($(stat -c %s "$WORK/$NAME") bytes)"

OK=true
heartbeat
log "backup OK"
