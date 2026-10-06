#!/usr/bin/env bash
# Deploy one Railway service and block until it is healthy (SUCCESS) or fails.
# Usage: deploy-service.sh <service> <environment> <commit-sha>
# Needs RAILWAY_TOKEN (project token of the target environment) and the railway CLI.
set -euo pipefail

service=$1 environment=$2 sha=$3
timeout_s=${DEPLOY_TIMEOUT_S:-900}

latest_id() {
  railway deployment list --service "$service" --environment "$environment" --limit 1 --json | jq -r '.[0].id // empty'
}
latest_status() {
  railway deployment list --service "$service" --environment "$environment" --limit 1 --json | jq -r '.[0].status // empty'
}

before=$(latest_id)
railway up --detach --service "$service" --environment "$environment" --message "$sha"

deadline=$((SECONDS + timeout_s))
while ((SECONDS < deadline)); do
  sleep 10
  id=$(latest_id)
  [ "$id" != "$before" ] || continue # new deployment not registered yet
  status=$(latest_status)
  echo "$service deployment $id: $status"
  case "$status" in
    SUCCESS) exit 0 ;;
    FAILED | CRASHED | REMOVED) echo "::error::$service deploy ended as $status"; exit 1 ;;
  esac
done
echo "::error::$service deploy timed out after ${timeout_s}s"
exit 1
