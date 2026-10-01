#!/usr/bin/env bash
# Retention tests (pure function, no network). Spec: operations/backup-automation.
source "$(dirname "$0")/harness.sh"

names() { # names ENV N START_DATE -> N consecutive daily backups ending at START_DATE (03:00Z)
  local i
  for ((i = 0; i < $2; i++)); do
    printf 'erp-medico-%s-%sT030000Z.dump.gpg\n' "$1" "$(date -u -d "$3 - $i days" +%Y%m%d)"
  done
}

echo "retention: 200 consecutive dailies"
ALL=$(names test 200 2026-09-30)
KEEP_ALL=$(printf '%s\n' "$ALL" | "$OPS_DIR/retention.sh" --keep-list)
DEL=$(printf '%s\n' "$ALL" | "$OPS_DIR/retention.sh")
for d in 20260930 20260929 20260928 20260927 20260926 20260925 20260924; do
  assert "keeps daily $d" grep -q "${d}T" <<<"$KEEP_ALL"
done
for d in 20260920 20260913; do assert "keeps weekly $d (newest of its ISO week)" grep -q "${d}T" <<<"$KEEP_ALL"; done
assert "does not keep non-newest of a weekly window" bash -c "! grep -q 20260919T <<<\"\$1\"" _ "$KEEP_ALL"
for d in 20260831 20260731 20260630 20260531 20260430; do assert "keeps monthly $d" grep -q "${d}T" <<<"$KEEP_ALL"; done
assert "deletes older than 6 months" grep -q "20260331T" <<<"$DEL"
assert "deletes a mid-month non-newest backup" grep -q "20260715T" <<<"$DEL"
assert "never lists a kept object for deletion" bash -c "! comm -12 <(sort <<<\"\$1\") <(sort <<<\"\$2\") | grep -q ." _ "$KEEP_ALL" "$DEL"
assert "kept + deleted = all" test "$(($(grep -c . <<<"$KEEP_ALL") + $(grep -c . <<<"$DEL")))" -eq 200
assert "keeps at most 17, at least 14" bash -c "n=\$(grep -c . <<<\"\$1\"); [ \$n -le 17 ] && [ \$n -ge 14 ]" _ "$KEEP_ALL"

echo "retention: small inputs"
assert "empty input deletes nothing" bash -c "[ -z \"\$(printf '' | '$OPS_DIR/retention.sh')\" ]"
ONE=$(names test 1 2026-09-30)
assert "single backup deleted never" bash -c "[ -z \"\$(printf '%s\n' '$ONE' | '$OPS_DIR/retention.sh')\" ]"

echo "retention: pre-migration keeps last 5"
PRE=$(names test 9 2026-09-30)
PDEL=$(printf '%s\n' "$PRE" | "$OPS_DIR/retention.sh" --pre-migration)
assert "deletes 4 oldest" test "$(grep -c . <<<"$PDEL")" -eq 4
assert "keeps newest pre-migration" bash -c "! grep -q 20260930T <<<\"\$1\"" _ "$PDEL"

echo "retention: ignores unrelated and sidecar names"
MIX=$(printf '%s\n' "$ALL" "erp-medico-test-20260930T030000Z.dump.gpg.sha256" "notes.txt")
MDEL=$(printf '%s\n' "$MIX" | "$OPS_DIR/retention.sh")
assert "does not list sidecar or foreign names" bash -c "! grep -q -e sha256 -e notes <<<\"\$1\"" _ "$MDEL"

finish
