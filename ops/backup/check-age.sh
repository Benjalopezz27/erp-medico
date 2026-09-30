#!/usr/bin/env bash
# Fails (and signals) when the newest automatic backup is older than BACKUP_MAX_AGE_HOURS.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
source ./lib.sh
require_env BACKUP_ENV BACKUP_BUCKET
MAX_H="${BACKUP_MAX_AGE_HOURS:-26}"

NEWEST=$(s3 ls "s3://${BACKUP_BUCKET}/${BACKUP_ENV}/auto/" | awk '{print $4}' |
  grep -E '^erp-medico-.*-[0-9]{8}T[0-9]{6}Z\.dump\.gpg$' | sed -E 's/.*-([0-9]{8}T[0-9]{6}Z)\.dump\.gpg/\1/' | sort | tail -1 || true)
if [ -z "$NEWEST" ]; then
  log "no backups found for ${BACKUP_ENV}"
  heartbeat fail
  exit 1
fi
ISO="${NEWEST:0:4}-${NEWEST:4:2}-${NEWEST:6:2}T${NEWEST:9:2}:${NEWEST:11:2}:${NEWEST:13:2}Z"
AGE_H=$((($(date -u +%s) - $(date -u -d "$ISO" +%s)) / 3600))
if [ "$AGE_H" -gt "$MAX_H" ]; then
  log "newest backup $NEWEST is ${AGE_H}h old (max ${MAX_H}h)"
  heartbeat fail
  exit 1
fi
log "newest backup $NEWEST is ${AGE_H}h old (max ${MAX_H}h) OK"
