.PHONY: up down dev seed runs pr terraform kill

up:
	@docker compose up -d postgres redis

down:
	@docker compose down -v

dev:
	@pnpm dev

seed:
	@./scripts/seed-events.sh

runs:
	@curl -sS http://localhost:8080/runs | jq .

pr:
	@./scripts/simulate-pr.sh

terraform:
	@./scripts/simulate-terraform.sh

kill:
	@lsof -ti :8080 | xargs kill -9 2>/dev/null || true

