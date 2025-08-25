.PHONY: up down dev seed runs pr terraform kill test test-local test-remote smoke

up:
	@docker compose up -d postgres redis

down:
	@docker compose down -v

dev:
	@pnpm dev

seed:
	@./scripts/seed-events.sh

test:
	@./scripts/test-system.sh

test-local:
	@./scripts/test-system.sh http://localhost:8080

test-remote:
	@./scripts/test-system.sh

smoke:
	@./scripts/smoke-test.sh

runs:
	@curl -s localhost:8080/runs | jq '.[0:5]'

pr:
	@./scripts/simulate-pr.sh

terraform:
	@./scripts/simulate-terraform.sh

kill:
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || true

