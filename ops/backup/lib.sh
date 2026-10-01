#!/usr/bin/env bash
# Shared helpers for the backup job. Source, do not execute.

export LC_ALL=C
PG_IMAGE="${PG_IMAGE:-postgres:16.15-alpine3.24}"

# Replace known secret values in stdin so they can never reach logs or alerts.
redact() {
  awk '
    BEGIN { n = split("DB_PASSWORD BACKUP_ENCRYPTION_PASSPHRASE AWS_SECRET_ACCESS_KEY AWS_ACCESS_KEY_ID BACKUP_HEARTBEAT_URL", k, " ") }
    {
      for (i = 1; i <= n; i++) {
        v = ENVIRON[k[i]]
        if (length(v) > 3) { while ((p = index($0, v)) > 0) $0 = substr($0, 1, p - 1) "[REDACTED]" substr($0, p + length(v)) }
      }
      print
    }'
}

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" | redact >&2; }

die() { log "ERROR: $*"; exit "${2:-1}"; }

require_env() {
  local v
  for v in "$@"; do
    [ -n "${!v:-}" ] || die "missing required env var $v" 2
  done
}

# Run a PostgreSQL client tool: local binary if present, otherwise the pinned postgres image.
pgx() {
  local tool=$1
  shift
  if command -v "$tool" >/dev/null 2>&1; then
    "$tool" "$@"
  else
    docker run --rm -i --network host -e PGPASSWORD "$PG_IMAGE" "$tool" "$@"
  fi
}

s3() {
  local args=()
  [ -n "${BACKUP_ENDPOINT_URL:-}" ] && args+=(--endpoint-url "$BACKUP_ENDPOINT_URL")
  aws "${args[@]}" s3 "$@" 2> >(redact >&2)
}

heartbeat() { # heartbeat [start|fail]
  [ -n "${BACKUP_HEARTBEAT_URL:-}" ] || return 0
  local suffix=""
  [ -n "${1:-}" ] && suffix="/$1"
  curl -fsS -m 10 --retry 2 -o /dev/null "${BACKUP_HEARTBEAT_URL%/}${suffix}" 2> >(redact >&2) ||
    log "WARN: heartbeat ${1:-success} could not be delivered"
}
