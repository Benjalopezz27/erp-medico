#!/usr/bin/env bash
# GFS retention as a pure function: backup object names on stdin, names to DELETE on stdout.
#   (default)        KEEP_DAILY newest days + KEEP_WEEKLY ISO weeks + KEEP_MONTHLY months;
#                    in each window the newest backup wins.
#   --pre-migration  keep the newest KEEP_PRE_MIGRATION, delete the rest.
#   --keep-list      print the names to KEEP instead (tests / dry inspection).
# Only names matching erp-medico-<env>-<UTC>.dump.gpg are considered; sidecars and foreign
# names are never listed.
set -euo pipefail

MODE=gfs
PRINT=delete
for a in "$@"; do
  case "$a" in
    --pre-migration) MODE=pre ;;
    --keep-list) PRINT=keep ;;
    *) echo "unknown option $a" >&2; exit 2 ;;
  esac
done
KEEP_DAILY="${KEEP_DAILY:-7}" KEEP_WEEKLY="${KEEP_WEEKLY:-4}" KEEP_MONTHLY="${KEEP_MONTHLY:-6}"
KEEP_PRE_MIGRATION="${KEEP_PRE_MIGRATION:-5}"

# newest first: "<ts> <name> <day> <iso-week>"
mapfile -t ROWS < <(
  { grep -E '^erp-medico-[A-Za-z0-9_]+-[0-9]{8}T[0-9]{6}Z\.dump\.gpg$' || true; } | while read -r n; do
    ts=${n##*-}
    ts=${ts%%.*}
    day=${ts:0:8}
    printf '%s %s %s %s\n' "$ts" "$n" "$day" "$(date -u -d "${day:0:4}-${day:4:2}-${day:6:2}" +%G-%V)"
  done | sort -r
)

declare -A KEEP=()
if [ "$MODE" = pre ]; then
  i=0
  for r in "${ROWS[@]}"; do
    read -r _ n _ _ <<<"$r"
    if [ "$i" -lt "$KEEP_PRE_MIGRATION" ]; then KEEP[$n]=1; fi
    i=$((i + 1))
  done
else
  declare -A DAY=() WEEK=() MONTH=()
  for r in "${ROWS[@]}"; do
    read -r _ n day week <<<"$r"
    month=${day:0:6}
    if [ -z "${DAY[$day]:-}" ]; then
      DAY[$day]=1
      [ "${#DAY[@]}" -le "$KEEP_DAILY" ] && KEEP[$n]=1
    fi
    if [ -z "${WEEK[$week]:-}" ]; then
      WEEK[$week]=1
      [ "${#WEEK[@]}" -le "$KEEP_WEEKLY" ] && KEEP[$n]=1
    fi
    if [ -z "${MONTH[$month]:-}" ]; then
      MONTH[$month]=1
      [ "${#MONTH[@]}" -le "$KEEP_MONTHLY" ] && KEEP[$n]=1
    fi
  done
fi

for r in "${ROWS[@]}"; do
  read -r _ n _ _ <<<"$r"
  if [ "$PRINT" = keep ]; then
    [ -n "${KEEP[$n]:-}" ] && echo "$n"
  else
    [ -z "${KEEP[$n]:-}" ] && echo "$n"
  fi
done
exit 0
