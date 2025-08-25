#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORCH_URL="${ORCH_URL:-http://localhost:8080}"

echo "Seeding runs via HTTP to $ORCH_URL/event" >&2

for f in samples/pr-event.json samples/incident-event.json; do
  echo "POST $f" >&2
  curl -sS -X POST "$ORCH_URL/event" \
    -H "Content-Type: application/json" \
    -d @"$ROOT_DIR/$f" | cat
  echo
done

echo "Done." >&2

