#!/usr/bin/env bash
# Backup tests (spec: operations/backup-automation). Needs docker; uses synthetic data only.
source "$(dirname "$0")/harness.sh"
trap stop_infra EXIT
start_pg
start_s3
base_env

echo "backup: success"
OUT=$("$OPS_DIR/backup.sh" 2>&1); RC=$?
assert "exit 0" test "$RC" -eq 0
KEY=$(s3ls "test/auto/" | awk '{print $4}' | grep '\.dump\.gpg$' | head -1)
assert "encrypted object uploaded" test -n "$KEY"
assert "sha256 sidecar uploaded" bash -c "source '$OPS_DIR/test/harness.sh'; s3ls 'test/auto/' | grep -q '\.sha256\$'"
TMP=$(mktemp)
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 cp "s3://erp-backups/$KEY" "$TMP" >/dev/null 2>&1
assert "object is not a plain pg dump" bash -c "! head -c 5 '$TMP' | grep -q PGDMP"
assert "object does not leak table data" bash -c "! grep -aq 'SKU-1' '$TMP'"
assert "object decrypts to a readable dump" bash -c "gpg --batch -q --pinentry-mode loopback --passphrase '$BACKUP_ENCRYPTION_PASSPHRASE' -d '$TMP' | docker run --rm -i postgres:16.15-alpine3.24 pg_restore --list >/dev/null"
assert "output has no secrets" bash -c "! echo \"\$1\" | grep -q -e pgtest -e testsecret123 -e 'correct horse'" _ "$OUT"

echo "backup: destination not approved"
COUNT_BEFORE=$(s3ls "" | wc -l)
OUT=$(BACKUP_DESTINATION_APPROVED= "$OPS_DIR/backup.sh" 2>&1); RC=$?
assert "aborts non-zero" test "$RC" -ne 0
assert "mentions approval" bash -c "echo \"\$1\" | grep -qi approved" _ "$OUT"
assert "uploads nothing" test "$(s3ls "" | wc -l)" -eq "$COUNT_BEFORE"

echo "backup: failing pg_dump"
COUNT_BEFORE=$(s3ls "" | wc -l)
OUT=$(DB_NAME=does_not_exist "$OPS_DIR/backup.sh" 2>&1); RC=$?
assert "non-zero on dump failure" test "$RC" -ne 0
assert "uploads nothing on dump failure" test "$(s3ls "" | wc -l)" -eq "$COUNT_BEFORE"

echo "backup: pre-migration label"
"$OPS_DIR/backup.sh" --label pre-migration >/dev/null 2>&1
assert "stored under pre-migration prefix" bash -c "source '$OPS_DIR/test/harness.sh'; s3ls 'test/pre-migration/' | grep -q '\.dump\.gpg'"

echo "backup: storage credentials and network failures"
COUNT_BEFORE=$(s3ls "" | wc -l)
OUT=$(AWS_SECRET_ACCESS_KEY=wrongsecret999 "$OPS_DIR/backup.sh" 2>&1); RC=$?
assert "non-zero on bad credentials" test "$RC" -ne 0
assert "bad-credential output has no secrets" bash -c "! echo \"\$1\" | grep -q -e pgtest -e wrongsecret999 -e 'correct horse'" _ "$OUT"
assert "nothing uploaded with bad credentials" test "$(s3ls "" | wc -l)" -eq "$COUNT_BEFORE"
OUT=$(BACKUP_ENDPOINT_URL=http://127.0.0.1:9 AWS_MAX_ATTEMPTS=1 "$OPS_DIR/backup.sh" 2>&1); RC=$?
assert "non-zero when storage unreachable" test "$RC" -ne 0

finish
