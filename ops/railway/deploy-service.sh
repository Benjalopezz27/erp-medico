#!/usr/bin/env bash
# Deploy one Railway service and block until it is healthy (SUCCESS) or fails.
# Usage: deploy-service.sh <service> <commit-sha>
# Needs RAILWAY_TOKEN (project token of the target environment), curl, jq.
# Uses the GraphQL API only: the railway CLI rejects project tokens on some commands.
set -euo pipefail

service=$1 sha=$2
timeout_s=${DEPLOY_TIMEOUT_S:-900}
api=https://backboard.railway.com/graphql/v2

gql() { # gql <query> <variables-json>
  local out
  out=$(curl -sS "$api" -H "Project-Access-Token: $RAILWAY_TOKEN" -H 'Content-Type: application/json' \
    -d "$(jq -n --arg q "$1" --argjson v "$2" '{query: $q, variables: $v}')")
  if jq -e '.errors' >/dev/null <<<"$out"; then
    echo "::error::Railway API: $(jq -c '.errors[].message' <<<"$out")" >&2
    return 1
  fi
  echo "$out"
}

ids=$(gql '{ projectToken { projectId environmentId } }' '{}')
project_id=$(jq -r '.data.projectToken.projectId' <<<"$ids")
environment_id=$(jq -r '.data.projectToken.environmentId' <<<"$ids")
service_id=$(gql 'query($p:String!){ project(id:$p){ services{ edges{ node{ id name } } } } }' \
  "$(jq -n --arg p "$project_id" '{p:$p}')" |
  jq -r --arg n "$service" '.data.project.services.edges[].node | select(.name == $n) | .id')
[ -n "$service_id" ] || { echo "::error::service '$service' not found"; exit 1; }

latest() { # prints "<id> <status>" of the newest deployment
  gql 'query($i:DeploymentListInput!){ deployments(first:1, input:$i){ edges{ node{ id status } } } }' \
    "$(jq -n --arg p "$project_id" --arg e "$environment_id" --arg s "$service_id" \
      '{i:{projectId:$p, environmentId:$e, serviceId:$s}}')" |
    jq -r '.data.deployments.edges[0].node | "\(.id // "") \(.status // "")"'
}

read -r before _ <<<"$(latest)"
# Deploys the exact commit from the GitHub repo connected to the service.
gql 'mutation($s:String!,$e:String!,$c:String!){ serviceInstanceDeployV2(serviceId:$s, environmentId:$e, commitSha:$c) }' \
  "$(jq -n --arg s "$service_id" --arg e "$environment_id" --arg c "$sha" '{s:$s,e:$e,c:$c}')" >/dev/null

deadline=$((SECONDS + timeout_s))
while ((SECONDS < deadline)); do
  sleep 10
  read -r id status <<<"$(latest)"
  [ "$id" != "$before" ] || continue # new deployment not registered yet
  echo "$service deployment $id: $status"
  case "$status" in
    SUCCESS) exit 0 ;;
    FAILED | CRASHED | REMOVED | SKIPPED) echo "::error::$service deploy ended as $status"; exit 1 ;;
  esac
done
echo "::error::$service deploy timed out after ${timeout_s}s"
exit 1
