#!/usr/bin/env bash
# Builds a synthetic ERP dataset, backs it up with the ops image, restores it with restore.sh into an
# isolated Postgres and serves the app (backend + frontend images from local.sh) on top of the
# RESTORED database, so a browser smoke test proves the restore is usable. Synthetic data only.
#   up   -> prints http://127.0.0.1:8080 and the synthetic credentials
#   down -> removes everything
# Needs images erp-rehearsal-backend:A / erp-rehearsal-frontend:A (run ops/rehearsal/local.sh first)
# and free ports 8080, 3100, 6390, 9300, 55501, 55502.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export LC_ALL=C AWS_EC2_METADATA_DISABLED=true
NAMES=(erp-smoke-src erp-smoke-redis erp-smoke-minio erp-smoke-backend erp-smoke-frontend)

down() {
  docker rm -f "${NAMES[@]}" >/dev/null 2>&1 || true
  docker ps -aq --filter name=erp-restore- | xargs -r docker rm -f >/dev/null 2>&1 || true
}
[ "${1:-}" = down ] && { down; echo "down"; exit 0; }
[ "${1:-}" = up ] || { echo "usage: $0 up|down" >&2; exit 2; }
down

PW=$(head -c 24 /dev/urandom | base64 | tr -d "/+=")
ADMIN_PW="Adm1n-$PW"
DBENV=(-e DB_HOST=127.0.0.1 -e DB_USER=postgres -e DB_PASSWORD=smoketest -e DB_NAME=erp -e REDIS_HOST=127.0.0.1 -e REDIS_PORT=6390
  -e JWT_SECRET="smoke-jwt-secret-0123456789-$PW" -e NODE_ENV=production -e JWT_EXPIRATION=8h -e ARCA_ENV=disabled)
BE=erp-rehearsal-backend:A

echo "== source: postgres + redis + migrations + seed"
docker run -d --name erp-smoke-src -p 127.0.0.1:55501:5432 -e POSTGRES_PASSWORD=smoketest -e POSTGRES_DB=erp postgres:16.15-alpine3.24 >/dev/null
docker run -d --name erp-smoke-redis -p 127.0.0.1:6390:6379 redis:7.4.11-alpine3.21 >/dev/null
until docker exec erp-smoke-src pg_isready -U postgres -d erp >/dev/null 2>&1; do sleep 1; done
sleep 2
docker run --rm --network host "${DBENV[@]}" -e DB_PORT=55501 "$BE" node dist/database/run-migrations.js >/dev/null
docker run --rm --network host "${DBENV[@]}" -e DB_PORT=55501 -e SEED_ADMIN_PASSWORD="$ADMIN_PW" -e SEED_VENDEDOR_PASSWORD="Vend-$PW" "$BE" node dist/database/seeds/seed.js

echo "== source backend: create a synthetic customer through the API"
docker run -d --name erp-smoke-backend --network host "${DBENV[@]}" -e DB_PORT=55501 -e PORT=3100 "$BE" >/dev/null
until curl -fs http://127.0.0.1:3100/api/v1/health/ready >/dev/null; do sleep 2; done
TOKEN=$(curl -fs -X POST http://127.0.0.1:3100/api/v1/auth/login -H 'content-type: application/json' \
  -d "{\"email\":\"admin@erp.com\",\"password\":\"$ADMIN_PW\"}" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("data") or d)["accessToken"])')
curl -fs -X POST http://127.0.0.1:3100/api/v1/customers -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"businessName":"Cliente Restauracion SA","documentType":"CUIT","cuitOrDni":"30-50001091-2","taxCondition":"RESPONSABLE_INSCRIPTO","email":"cliente@example.invalid"}' >/dev/null
docker rm -f erp-smoke-backend >/dev/null
SRC_COUNT=$(docker exec erp-smoke-src psql -U postgres -d erp -Atc "select (select count(*) from products)||' products, '||(select count(*) from customers)||' customers, '||(select count(*) from users)||' users'")
echo "source: $SRC_COUNT"

echo "== backup (ops image) -> MinIO"
docker run -d --name erp-smoke-minio -p 127.0.0.1:9300:9000 -e MINIO_ROOT_USER=testkey -e MINIO_ROOT_PASSWORD=testsecret123 quay.io/minio/minio server /data >/dev/null
until curl -fs http://127.0.0.1:9300/minio/health/ready >/dev/null; do sleep 1; done
export AWS_ACCESS_KEY_ID=testkey AWS_SECRET_ACCESS_KEY=testsecret123 AWS_DEFAULT_REGION=us-east-1
aws --endpoint-url http://127.0.0.1:9300 s3 mb s3://erp-backups >/dev/null
docker build -q -t erp-medico-backup:test "$ROOT/ops/backup" >/dev/null
docker run --rm --network host -e DB_HOST=127.0.0.1 -e DB_PORT=55501 -e DB_USER=postgres -e DB_PASSWORD=smoketest -e DB_NAME=erp \
  -e BACKUP_ENV=smoke -e BACKUP_BUCKET=erp-backups -e BACKUP_ENDPOINT_URL=http://127.0.0.1:9300 \
  -e BACKUP_ENCRYPTION_PASSPHRASE=smoke-passphrase-xyz -e BACKUP_DESTINATION_APPROVED=true \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION -e AWS_EC2_METADATA_DISABLED erp-medico-backup:test

echo "== restore into isolated postgres (published on 127.0.0.1:55502 only for this smoke)"
BACKUP_ENV=smoke BACKUP_BUCKET=erp-backups BACKUP_ENDPOINT_URL=http://127.0.0.1:9300 BACKUP_ENCRYPTION_PASSPHRASE=smoke-passphrase-xyz \
  DB_HOST=smoke-source DB_NAME=erp "$ROOT/ops/backup/restore.sh" --latest --keep --publish 55502 --report /tmp/erp-smoke-restore.json
docker exec "$(docker ps -q --filter name=erp-restore-)" psql -U postgres -d restore -Atc \
  "select (select count(*) from products)||' products, '||(select count(*) from customers)||' customers, '||(select count(*) from users)||' users'" | sed 's/^/restored: /'
RPW=$(docker inspect "$(docker ps -q --filter name=erp-restore-)" --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^POSTGRES_PASSWORD=//p')

echo "== app on top of the RESTORED database"
RENV=(-e DB_HOST=127.0.0.1 -e DB_PORT=55502 -e DB_USER=postgres -e DB_PASSWORD="$RPW" -e DB_NAME=restore -e REDIS_HOST=127.0.0.1 -e REDIS_PORT=6390
  -e JWT_SECRET="smoke-jwt-secret-0123456789-$PW" -e NODE_ENV=production -e JWT_EXPIRATION=8h -e ARCA_ENV=disabled -e PORT=3100)
docker run -d --name erp-smoke-backend --network host "${RENV[@]}" "$BE" >/dev/null
until curl -fs http://127.0.0.1:3100/api/v1/health/ready >/dev/null; do sleep 2; done
docker run -d --name erp-smoke-frontend --network host -e BACKEND_HOST=127.0.0.1 -e BACKEND_PORT=3100 erp-rehearsal-frontend:A >/dev/null
until curl -fs http://127.0.0.1:8080/api/v1/health/ready >/dev/null; do sleep 2; done
echo "READY http://127.0.0.1:8080  user=admin@erp.com  password=$ADMIN_PW"
