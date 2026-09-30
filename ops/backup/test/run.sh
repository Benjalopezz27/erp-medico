#!/usr/bin/env bash
# Runs every ops test sequentially (they share container names and ports). Needs docker.
cd "$(dirname "$0")"
RC=0
for t in retention backup alerts restore image; do
  echo "=== $t"
  bash "./$t.test.sh" || RC=1
done
exit $RC
