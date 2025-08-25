#!/usr/bin/env bash
set -euo pipefail

docker compose up -d postgres redis
echo "Waiting for Postgres..."
until docker exec $(docker ps -qf name=agentic-devops-postgres-1) pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done
echo "Postgres ready."

