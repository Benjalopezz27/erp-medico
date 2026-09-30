#!/usr/bin/env bash
# Local release rehearsal: deploy with migration -> smoke -> rollback, plus failed migration and a
# pre-migration backup restored with restore.sh. Synthetic data only; touches no shared infra.
#   A = HEAD (known good)   B = HEAD + backward-compatible migration   C = HEAD + failing migration
# B and C are built from a throw-away copy of HEAD; nothing is committed to the repo.
# Usage: ops/rehearsal/local.sh [--keep]   (prints "STEP <name> <seconds>s <PASS|FAIL>" lines)
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
KEEP=false
[ "${1:-}" = "--keep" ] && KEEP=true

export LC_ALL=C
P=erp-rehearsal
WORK=$(mktemp -d)
SHA=$(git rev-parse --short HEAD)
ENVF="$WORK/env"
FAILED=0
COMPOSE=(docker compose -p "$P" -f "$ROOT/docker-compose.prod.yml" --env-file "$ENVF")
S3_PORT=9200

cat >"$ENVF" <<ENV
BACKEND_IMAGE=erp-rehearsal-backend:A
FRONTEND_IMAGE=erp-rehearsal-frontend:A
FRONTEND_PORT=18080
DB_USER=erp_user
DB_NAME=erp_medico
DB_PASSWORD=$(head -c 18 /dev/urandom | base64 | tr -d '/+=')
JWT_SECRET=$(head -c 36 /dev/urandom | base64 | tr -d '/+=')
ENV

cleanup() {
  if [ "$KEEP" != true ]; then
    "${COMPOSE[@]}" --profile migration --profile worker down -v >/dev/null 2>&1 || true
    docker rm -f rehearsal-minio >/dev/null 2>&1 || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

t_now() { date +%s.%N; }
step() { # step name cmd...   -> runs, times, prints result; counts failures
  local name=$1 s out rc=0
  shift
  s=$(t_now)
  "$@" >"$WORK/step.out" 2>&1 || rc=$?
  printf 'STEP %s %.1fs %s\n' "$name" "$(awk -v a="$s" -v b="$(t_now)" 'BEGIN{print b-a}')" "$([ $rc -eq 0 ] && echo PASS || echo FAIL)"
  if [ $rc -ne 0 ]; then FAILED=1; tail -15 "$WORK/step.out" | sed 's/^/     | /'; fi
  return 0
}
expect_fail() { if "$@"; then return 1; else return 0; fi; }

ready() { # ready: backend answers /api/v1/health/ready with 200 inside the network
  "${COMPOSE[@]}" exec -T backend node -e "require('http').get('http://127.0.0.1:3000/api/v1/health/ready',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
}
wait_ready() { local i; for i in $(seq 1 60); do ready && return 0; sleep 2; done; return 1; }
psql_() { "${COMPOSE[@]}" exec -T postgres psql -U erp_user -d erp_medico -At "$@"; }
use_backend() { sed -i "s#^BACKEND_IMAGE=.*#BACKEND_IMAGE=erp-rehearsal-backend:$1#" "$ENVF"; }

build_variants() {
  git archive HEAD | tar -x -C "$WORK"
  mkdir -p "$WORK/variant-B" "$WORK/variant-C"
  docker build -q -t erp-rehearsal-backend:A -f apps/backend/Dockerfile --build-arg APP_COMMIT_SHA="$SHA-A" "$WORK" >/dev/null
  docker build -q -t erp-rehearsal-frontend:A -f apps/frontend/Dockerfile "$WORK" >/dev/null
  local d=apps/backend/src/database/migrations
  cat >"$WORK/$d/1700000000099-RehearsalAddNote.ts" <<'TS'
import { MigrationInterface, QueryRunner } from 'typeorm';
export class RehearsalAddNote1700000000099 implements MigrationInterface {
  name = 'RehearsalAddNote1700000000099';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "_migrations_check" ADD COLUMN "rehearsal_note" text NULL`);
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "_migrations_check" DROP COLUMN "rehearsal_note"`);
  }
}
TS
  docker build -q -t erp-rehearsal-backend:B -f apps/backend/Dockerfile --build-arg APP_COMMIT_SHA="$SHA-B" "$WORK" >/dev/null
  cat >"$WORK/$d/1700000000099-RehearsalAddNote.ts" <<'TS'
import { MigrationInterface, QueryRunner } from 'typeorm';
export class RehearsalAddNote1700000000099 implements MigrationInterface {
  name = 'RehearsalAddNote1700000000099';
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`SELECT 1/0`);
  }
  public async down(): Promise<void> {}
}
TS
  docker build -q -t erp-rehearsal-backend:C -f apps/backend/Dockerfile --build-arg APP_COMMIT_SHA="$SHA-C" "$WORK" >/dev/null
}

start_stack_A() {
  use_backend A
  "${COMPOSE[@]}" up -d postgres redis
  "${COMPOSE[@]}" --profile migration run --rm migration
  "${COMPOSE[@]}" up -d backend
  wait_ready
  psql_ -c "INSERT INTO _migrations_check (status) VALUES ('rehearsal-sentinel')"
}

start_minio() {
  docker rm -f rehearsal-minio >/dev/null 2>&1 || true
  docker run -d --name rehearsal-minio --network "${P}_app" -p 127.0.0.1:$S3_PORT:9000 -e MINIO_ROOT_USER=testkey \
    -e MINIO_ROOT_PASSWORD=testsecret123 quay.io/minio/minio server /data >/dev/null
  until curl -fs "http://127.0.0.1:$S3_PORT/minio/health/ready" >/dev/null; do sleep 1; done
  AWS_ACCESS_KEY_ID=testkey AWS_SECRET_ACCESS_KEY=testsecret123 AWS_DEFAULT_REGION=us-east-1 AWS_EC2_METADATA_DISABLED=true \
    aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 mb s3://erp-backups
}

backup_args() { # backup_args -> env flags shared by backup container and restore host run
  # shellcheck disable=SC2046
  echo -e "BACKUP_ENV=rehearsal\nBACKUP_BUCKET=erp-backups\nBACKUP_ENCRYPTION_PASSPHRASE=rehearsal-passphrase-xyz\nBACKUP_DESTINATION_APPROVED=true\nAWS_ACCESS_KEY_ID=testkey\nAWS_SECRET_ACCESS_KEY=testsecret123\nAWS_DEFAULT_REGION=us-east-1"
}

pre_migration_backup() {
  docker build -q -t erp-medico-backup:test ops/backup >/dev/null
  # shellcheck disable=SC2046
  docker run --rm --network "${P}_app" $(backup_args | sed 's/^/-e /' | tr '\n' ' ') \
    -e DB_HOST=postgres -e DB_PORT=5432 -e DB_USER=erp_user -e DB_PASSWORD="$(grep ^DB_PASSWORD "$ENVF" | cut -d= -f2)" -e DB_NAME=erp_medico \
    -e BACKUP_ENDPOINT_URL=http://rehearsal-minio:9000 -e AWS_EC2_METADATA_DISABLED=true \
    erp-medico-backup:test ./backup.sh --label pre-migration
}

deploy_B() {
  use_backend B
  "${COMPOSE[@]}" --profile migration run --rm migration
  "${COMPOSE[@]}" up -d --no-deps --force-recreate backend
  wait_ready
  [ "$(psql_ -c "SELECT count(*) FROM information_schema.columns WHERE table_name='_migrations_check' AND column_name='rehearsal_note'")" = 1 ]
  [ "$(psql_ -c "SELECT count(*) FROM _migrations_check WHERE status='rehearsal-sentinel'")" = 1 ]
}

rollback_to_A() {
  use_backend A
  "${COMPOSE[@]}" up -d --no-deps --force-recreate backend
  wait_ready
  [ "$(psql_ -c "SELECT count(*) FROM _migrations_check WHERE status='rehearsal-sentinel'")" = 1 ]
}

failed_migration_C() {
  use_backend C
  expect_fail "${COMPOSE[@]}" --profile migration run --rm migration
  use_backend A
  ready   # A never stopped serving
}

restore_pre_migration_backup() {
  # shellcheck disable=SC2046
  export $(backup_args | xargs) BACKUP_ENDPOINT_URL="http://127.0.0.1:$S3_PORT" AWS_EC2_METADATA_DISABLED=true
  export DB_HOST=rehearsal DB_NAME=erp_medico
  "$ROOT/ops/backup/restore.sh" --latest --label pre-migration --report "$WORK/restore-report.json"
  grep -q '"status": "ok"' "$WORK/restore-report.json"
}

echo "REHEARSAL sha=$SHA date=$(date -u +%FT%TZ)"
step build-images build_variants
step deploy-A-migrate-smoke start_stack_A
step minio-up start_minio
step pre-migration-backup pre_migration_backup
step deploy-B-migrate-smoke deploy_B
step rollback-to-A-smoke rollback_to_A
step failed-migration-C-A-keeps-serving failed_migration_C
step restore-pre-migration-backup restore_pre_migration_backup
[ -f "$WORK/restore-report.json" ] && { echo "RESTORE_REPORT"; cat "$WORK/restore-report.json"; }
echo "RESULT $([ $FAILED -eq 0 ] && echo PASS || echo FAIL)"
exit $FAILED
