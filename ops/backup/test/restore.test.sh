#!/usr/bin/env bash
# Restore tests (spec: operations/restore-verification). Needs docker; synthetic data only.
source "$(dirname "$0")/harness.sh"
trap 'stop_infra; docker ps -aq --filter name=erp-restore- | xargs -r docker rm -f >/dev/null 2>&1' EXIT
start_pg
start_s3
base_env
docker exec -i erp-ops-pg psql -q -U postgres -d erp_src -c 'DROP TABLE products' >/dev/null
docker exec -i erp-ops-pg psql -q -U postgres -d erp_src <"$OPS_DIR/test/fixtures/schema.sql" >/dev/null

echo "restore: healthy latest backup"
"$OPS_DIR/backup.sh" >/dev/null 2>&1
REPORT=$(mktemp)
OUT=$("$OPS_DIR/restore.sh" --latest --report "$REPORT" 2>&1); RC=$?
assert "exit 0" test "$RC" -eq 0
assert "report says ok" grep -q '"status": *"ok"' "$REPORT"
assert "report has timings" bash -c "grep -q restore_seconds '$REPORT' && grep -q download_seconds '$REPORT' && grep -q backup_age_seconds '$REPORT' && grep -q total_seconds '$REPORT'"
assert "report lists ledger check" grep -q ledger_balance_matches_movements "$REPORT"
assert "ephemeral container destroyed" test -z "$(docker ps -aq --filter name=erp-restore-)"
assert "output has no secrets" bash -c "! echo \"\$1\" | grep -q -e pgtest -e testsecret123 -e 'correct horse'" _ "$OUT"

echo "restore: older copy"
KEY1=$(s3ls "test/auto/" | awk '{print $4}' | xargs -n1 basename | grep '\.dump\.gpg$' | head -1)
sleep 1
"$OPS_DIR/backup.sh" >/dev/null 2>&1
assert "restore by name of older backup" "$OPS_DIR/restore.sh" --name "$KEY1"

echo "restore: corrupt and wrong key"
TMP=$(mktemp -d)
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 cp "s3://erp-backups/test/auto/$KEY1" "$TMP/obj" >/dev/null 2>&1
head -c 2000 "$TMP/obj" >"$TMP/trunc"
BADNAME="erp-medico-test-20990101T000000Z.dump.gpg"
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 cp "s3://erp-backups/test/auto/$KEY1.sha256" "$TMP/sha" >/dev/null 2>&1
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 cp "$TMP/trunc" "s3://erp-backups/test/auto/$BADNAME" >/dev/null 2>&1
sed "s/$KEY1/$BADNAME/" "$TMP/sha" >"$TMP/sha2"
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 cp "$TMP/sha2" "s3://erp-backups/test/auto/$BADNAME.sha256" >/dev/null 2>&1
OUT=$("$OPS_DIR/restore.sh" --name "$BADNAME" 2>&1); RC=$?
assert "checksum mismatch aborts" test "$RC" -ne 0
assert "mentions checksum" bash -c "echo \"\$1\" | grep -qi checksum" _ "$OUT"
assert "no container left after abort" test -z "$(docker ps -aq --filter name=erp-restore-)"
OUT=$(BACKUP_ENCRYPTION_PASSPHRASE=wrong-key-123 "$OPS_DIR/restore.sh" --name "$KEY1" 2>&1); RC=$?
assert "wrong key aborts" test "$RC" -ne 0
assert "mentions decrypt" bash -c "echo \"\$1\" | grep -qi decrypt" _ "$OUT"

echo "restore: target equals source"
OUT=$(RESTORE_HOST=127.0.0.1 RESTORE_PORT=$PG_PORT RESTORE_DB=erp_src "$OPS_DIR/restore.sh" --name "$KEY1" 2>&1); RC=$?
assert "aborts when target is the source" test "$RC" -ne 0
assert "mentions source" bash -c "echo \"\$1\" | grep -qi source" _ "$OUT"
assert "source data untouched" bash -c "docker exec erp-ops-pg psql -U postgres -d erp_src -Atc 'select count(*) from stocks' | grep -qx 50"

echo "restore: corrupted ledger is detected"
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 rm "s3://erp-backups/test/auto/" --recursive --exclude "*" --include "*20990101*" >/dev/null 2>&1
docker exec -i erp-ops-pg psql -q -U postgres -d erp_src -c "UPDATE account_receivables SET current_balance = 123.45" >/dev/null
"$OPS_DIR/backup.sh" >/dev/null 2>&1
REPORT2=$(mktemp); 
OUT=$("$OPS_DIR/restore.sh" --latest --report "$REPORT2" 2>&1); RC=$?
assert "non-zero on invariant violation" test "$RC" -ne 0
assert "report names failing check" grep -q 'ledger_balance_matches_movements' "$REPORT2"
assert "report status failed" grep -q '"status": *"failed"' "$REPORT2"
finish
