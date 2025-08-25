#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVENT_FILE="${ROOT_DIR}/samples/deploy-event.json"
ORCH_URL="${ORCH_URL:-http://localhost:8080/event}"

if [[ ! -f "$EVENT_FILE" ]]; then
  echo "Missing $EVENT_FILE" >&2
  exit 1
fi

echo "POST $ORCH_URL with $EVENT_FILE" >&2

if [[ -n "${ORCH_TOKEN:-}" ]]; then
  curl -sS -X POST "$ORCH_URL" \
    -H "Authorization: Bearer $ORCH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @"$EVENT_FILE" | cat
else
  curl -sS -X POST "$ORCH_URL" \
    -H "Content-Type: application/json" \
    -d @"$EVENT_FILE" | cat
fi

echo

