#!/usr/bin/env bash
# Minimal assert harness + ephemeral Postgres/MinIO for the ops tests. Source, do not execute.

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_PORT=55432
S3_PORT=9100
FAILS=0
PASSES=0

pass() { PASSES=$((PASSES + 1)); printf '  ok   %s\n' "$1"; }
fail() { FAILS=$((FAILS + 1)); printf '  FAIL %s\n' "$1"; }
assert() { # assert "desc" cmd...
  local d=$1
  shift
  if "$@" >/dev/null 2>&1; then pass "$d"; else fail "$d"; fi
}
assert_not() { # assert_not "desc" cmd...
  local d=$1
  shift
  if "$@" >/dev/null 2>&1; then fail "$d"; else pass "$d"; fi
}
finish() { printf '%s passed, %s failed\n' "$PASSES" "$FAILS"; [ "$FAILS" -eq 0 ]; }

start_pg() {
  docker rm -f erp-ops-pg >/dev/null 2>&1
  docker run -d --name erp-ops-pg -p 127.0.0.1:$PG_PORT:5432 -e POSTGRES_PASSWORD=pgtest \
    -e POSTGRES_DB=erp_src postgres:16.15-alpine3.24 >/dev/null
  until docker exec erp-ops-pg pg_isready -U postgres -d erp_src >/dev/null 2>&1; do sleep 1; done
  sleep 2
  docker exec -i erp-ops-pg psql -q -U postgres -d erp_src <<'SQL'
CREATE TABLE products (id serial PRIMARY KEY, sku text NOT NULL, stock numeric(14,4) NOT NULL CHECK (stock >= 0));
INSERT INTO products (sku, stock) SELECT 'SKU-' || g, g FROM generate_series(1, 200) g;
SQL
}

start_s3() {
  docker rm -f erp-ops-minio >/dev/null 2>&1
  docker run -d --name erp-ops-minio -p 127.0.0.1:$S3_PORT:9000 -e MINIO_ROOT_USER=testkey \
    -e MINIO_ROOT_PASSWORD=testsecret123 quay.io/minio/minio server /data >/dev/null
  export AWS_ACCESS_KEY_ID=testkey AWS_SECRET_ACCESS_KEY=testsecret123 AWS_DEFAULT_REGION=us-east-1
  export AWS_EC2_METADATA_DISABLED=true
  until curl -fs "http://127.0.0.1:$S3_PORT/minio/health/ready" >/dev/null; do sleep 1; done
  aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 mb s3://erp-backups >/dev/null
}

stop_infra() { docker rm -f erp-ops-pg erp-ops-minio erp-ops-hb >/dev/null 2>&1; }

base_env() {
  export DB_HOST=127.0.0.1 DB_PORT=$PG_PORT DB_USER=postgres DB_PASSWORD=pgtest DB_NAME=erp_src
  export BACKUP_ENV=test BACKUP_BUCKET=erp-backups BACKUP_ENDPOINT_URL="http://127.0.0.1:$S3_PORT"
  export BACKUP_ENCRYPTION_PASSPHRASE='correct horse battery staple' BACKUP_DESTINATION_APPROVED=true
  export AWS_ACCESS_KEY_ID=testkey AWS_SECRET_ACCESS_KEY=testsecret123 AWS_DEFAULT_REGION=us-east-1
  unset BACKUP_HEARTBEAT_URL
}

s3ls() { aws --endpoint-url "http://127.0.0.1:$S3_PORT" s3 ls "s3://erp-backups/$1" --recursive 2>/dev/null; }
