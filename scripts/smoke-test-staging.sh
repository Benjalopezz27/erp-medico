#!/usr/bin/env bash
# ==============================================================================
# ERP Distribuidora Médica — Automated Staging Smoke Test Suite
# ==============================================================================
# Verifies TLS, HTTP redirects, health endpoints, version metadata, SPA fallback,
# and zero public exposure for the managed PostgreSQL service.
# ==============================================================================

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <staging_url> <expected_commit_sha>" >&2
  echo "Example: $0 https://staging.erp-medico.com 3575c1a1b49079f8b4..." >&2
  exit 1
fi

STAGING_URL="${1%/}"
EXPECTED_SHA="$2"

# Extract domain/host from URL
DOMAIN=$(echo "$STAGING_URL" | awk -F[/:] '{print $4}')
if [ -z "$DOMAIN" ]; then
  DOMAIN=$(echo "$STAGING_URL" | awk -F[/:] '{print $1}')
fi

echo "=============================================================================="
echo " Starting Staging Smoke Test Suite"
echo " Target URL:    $STAGING_URL"
echo " Target Domain: $DOMAIN"
echo " Expected SHA:  $EXPECTED_SHA"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# Test 1: HTTP -> HTTPS Redirection
# ------------------------------------------------------------------------------
echo -n "[1/6] Testing HTTP -> HTTPS Redirection... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}" || echo "000")
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "308" ]; then
  echo "PASS (HTTP $HTTP_CODE redirect)"
else
  echo "FAIL (Received HTTP $HTTP_CODE, expected 301/302/308)" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Test 2: Valid HTTPS & TLS Handshake
# ------------------------------------------------------------------------------
echo -n "[2/6] Testing HTTPS TLS Handshake & Certificate Validity... "
if curl -sSfI "${STAGING_URL}" >/dev/null; then
  echo "PASS (Valid TLS certificate)"
else
  echo "FAIL (TLS handshake failed)" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Test 3: Backend Health Endpoint & Database Status (/api/v1/health)
# ------------------------------------------------------------------------------
echo -n "[3/6] Testing Backend Health Endpoint (/api/v1/health)... "
HEALTH_JSON=$(curl -sSf "${STAGING_URL}/api/v1/health")
STATUS=$(echo "$HEALTH_JSON" | jq -r '.status // empty')
DB_STATUS=$(echo "$HEALTH_JSON" | jq -r '.services.database // empty')
ACTUAL_BACKEND_SHA=$(echo "$HEALTH_JSON" | jq -r '.commitSha // empty')

if [ "$STATUS" != "ok" ]; then
  echo "FAIL (Health status is '$STATUS', expected 'ok')" >&2
  exit 1
fi

if [ "$DB_STATUS" != "up" ]; then
  echo "FAIL (Database status is '$DB_STATUS', expected 'up')" >&2
  exit 1
fi

if [[ "$EXPECTED_SHA" != "$ACTUAL_BACKEND_SHA"* ]] && [[ "$ACTUAL_BACKEND_SHA" != "$EXPECTED_SHA"* ]]; then
  echo "FAIL (Backend commitSha '$ACTUAL_BACKEND_SHA' does not match expected '$EXPECTED_SHA')" >&2
  exit 1
fi
echo "PASS (status: ok, database: up, SHA matched)"

# ------------------------------------------------------------------------------
# Test 4: Frontend Version Metadata (/version.json)
# ------------------------------------------------------------------------------
echo -n "[4/6] Testing Frontend Version Metadata (/version.json)... "
VERSION_JSON=$(curl -sSf "${STAGING_URL}/version.json")
ACTUAL_FRONTEND_SHA=$(echo "$VERSION_JSON" | jq -r '.commitSha // empty')

if [[ "$EXPECTED_SHA" != "$ACTUAL_FRONTEND_SHA"* ]] && [[ "$ACTUAL_FRONTEND_SHA" != "$EXPECTED_SHA"* ]]; then
  echo "FAIL (Frontend commitSha '$ACTUAL_FRONTEND_SHA' does not match expected '$EXPECTED_SHA')" >&2
  exit 1
fi
echo "PASS (SHA matched: $ACTUAL_FRONTEND_SHA)"

# ------------------------------------------------------------------------------
# Test 5: SPA Client-Side Routing Fallback
# ------------------------------------------------------------------------------
echo -n "[5/6] Testing SPA Route Fallback (/stock/quarantine)... "
SPA_HTML=$(curl -sSf "${STAGING_URL}/stock/quarantine")
if echo "$SPA_HTML" | grep -q '<div id="root">'; then
  echo "PASS (SPA HTML shell returned)"
else
  echo "FAIL (Expected <div id=\"root\"> in response)" >&2
  exit 1
fi

# ------------------------------------------------------------------------------
# Test 6: Database Zero Port Exposure
# ------------------------------------------------------------------------------
echo -n "[6/6] Testing Public PostgreSQL Port Exposure (5432)... "
# Test connection with 2-second timeout (expecting connection refusal or timeout)
if (timeout 2 bash -c "</dev/tcp/${DOMAIN}/5432") 2>/dev/null; then
  echo "FAIL (PostgreSQL port 5432 is publicly open!)" >&2
  exit 1
fi
echo "PASS (Port 5432 is closed to the public internet)"

echo "=============================================================================="
echo " All Staging Smoke Tests PASSED Successfully!"
echo "=============================================================================="
