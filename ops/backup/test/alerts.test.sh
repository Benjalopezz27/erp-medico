#!/usr/bin/env bash
# Retention wiring, heartbeat and age-check tests.
source "$(dirname "$0")/harness.sh"
HB_LOG=$(mktemp)
HB_PID=
cleanup() { [ -n "$HB_PID" ] && kill "$HB_PID" 2>/dev/null; stop_infra; }
trap cleanup EXIT
start_pg
start_s3
base_env

python3 - "$HB_LOG" <<'PY' &
import sys, http.server
log = sys.argv[1]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        open(log, "a").write(self.path + "\n"); self.send_response(200); self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", 9101), H).serve_forever()
PY
HB_PID=$!
sleep 1
export BACKUP_HEARTBEAT_URL=http://127.0.0.1:9101/ping/tok3n-secret

echo "heartbeat: success"
"$OPS_DIR/backup.sh" >/dev/null 2>&1
assert "start signal received" grep -q '^/ping/tok3n-secret/start$' "$HB_LOG"
assert "success signal received" grep -q '^/ping/tok3n-secret$' "$HB_LOG"

echo "heartbeat: failure"
: >"$HB_LOG"
OUT=$(AWS_SECRET_ACCESS_KEY=wrongsecret999 "$OPS_DIR/backup.sh" 2>&1); RC=$?
assert "non-zero" test "$RC" -ne 0
assert "fail signal received" grep -q '^/ping/tok3n-secret/fail$' "$HB_LOG"
assert "no success signal after failure" bash -c "! grep -q '^/ping/tok3n-secret\$' '$HB_LOG'"
assert "heartbeat token not printed" bash -c "! echo \"\$1\" | grep -q tok3n-secret" _ "$OUT"

echo "age check"
assert "fresh backup passes" "$OPS_DIR/check-age.sh"
touch /tmp/empty.$$
put_old() { aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 cp /tmp/empty.$$ "s3://erp-backups/$1" >/dev/null 2>&1; }
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 rm s3://erp-backups/test/auto/ --recursive >/dev/null 2>&1
put_old "test/auto/erp-medico-test-20200101T030000Z.dump.gpg"
: >"$HB_LOG"
assert_not "old backup fails" "$OPS_DIR/check-age.sh"
assert "old backup signals fail" grep -q '/fail$' "$HB_LOG"
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 rm s3://erp-backups/test/auto/ --recursive >/dev/null 2>&1
assert_not "no backups fails" "$OPS_DIR/check-age.sh"

echo "retention wiring"
unset BACKUP_HEARTBEAT_URL
for d in $(seq 1 40); do
  n="erp-medico-test-$(date -u -d "2026-09-30 - $d days" +%Y%m%d)T030000Z.dump.gpg"
  put_old "test/auto/$n"; put_old "test/auto/$n.sha256"
done
BEFORE=$(s3ls "test/auto/" | grep -c 'dump.gpg$')
"$OPS_DIR/backup.sh" >/dev/null 2>&1
assert "dry-run by default deletes nothing" test "$(s3ls "test/auto/" | grep -c 'dump.gpg$')" -eq $((BEFORE + 1))
BACKUP_RETENTION_APPLY=true "$OPS_DIR/backup.sh" >/dev/null 2>&1
AFTER=$(s3ls "test/auto/" | grep -c 'dump.gpg$')
assert "apply mode prunes old backups" test "$AFTER" -lt "$BEFORE"
assert "sidecars of pruned backups removed" bash -c "source '$OPS_DIR/test/harness.sh'; [ \$(s3ls test/auto/ | grep -c 'dump.gpg.sha256\$') -le $AFTER ]"
assert "latest backup kept" bash -c "source '$OPS_DIR/test/harness.sh'; s3ls test/auto/ | grep -q \"\$(date -u +%Y%m%d)T\""

echo "retention: not run when upload fails"
aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 rm s3://erp-backups/test/auto/ --recursive >/dev/null 2>&1
for d in $(seq 1 30); do n="erp-medico-test-$(date -u -d "2026-09-30 - $d days" +%Y%m%d)T030000Z.dump.gpg"; put_old "test/auto/$n"; done
B2=$(s3ls "test/auto/" | wc -l)
BACKUP_RETENTION_APPLY=true BACKUP_ENDPOINT_URL=http://127.0.0.1:9 AWS_MAX_ATTEMPTS=1 "$OPS_DIR/backup.sh" >/dev/null 2>&1
assert "existing backups untouched when upload fails" test "$(s3ls "test/auto/" | wc -l)" -eq "$B2"
rm -f /tmp/empty.$$
finish
