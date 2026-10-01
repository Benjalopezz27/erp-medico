#!/usr/bin/env bash
# Builds the backup image and runs a real backup + age check from inside it.
source "$(dirname "$0")/harness.sh"
trap stop_infra EXIT
docker build -q -t erp-medico-backup:test "$OPS_DIR" >/dev/null
start_pg
start_s3
base_env
ENVS=(-e DB_HOST -e DB_PORT -e DB_USER -e DB_PASSWORD -e DB_NAME -e BACKUP_ENV -e BACKUP_BUCKET
  -e BACKUP_ENDPOINT_URL -e BACKUP_ENCRYPTION_PASSPHRASE -e BACKUP_DESTINATION_APPROVED
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_DEFAULT_REGION -e AWS_EC2_METADATA_DISABLED)
export AWS_EC2_METADATA_DISABLED=true

echo "image: backup + age check"
assert "image runs backup.sh" docker run --rm --network host "${ENVS[@]}" erp-medico-backup:test
assert "object stored by image run" bash -c "source '$OPS_DIR/test/harness.sh'; s3ls test/auto/ | grep -q '\.dump\.gpg'"
assert "image runs check-age.sh" docker run --rm --network host "${ENVS[@]}" erp-medico-backup:test ./check-age.sh
assert "image does not run as root" bash -c "[ \"\$(docker run --rm erp-medico-backup:test id -u)\" != 0 ]"
finish
