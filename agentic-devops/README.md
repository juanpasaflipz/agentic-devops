# Agentic DevOps (MVP)

Event-driven orchestrator with Conductor planning and minimal tool router.
See `policy.yaml` and the `runbooks/` directory for configuration details.

## Prerequisites

- Node.js 18+ and pnpm
- Docker (optional, for local Postgres/Redis)

## Quickstart

- pnpm install
- pnpm add @google-cloud/storage
- cp .env.example .env
- make up (optional: starts Postgres/Redis via Docker)
- make dev (starts on :8080; use `PORT=8081 make dev` to change port)
- curl localhost:8080/healthz
- curl localhost:8080/runs

Common tasks (in a second terminal):

- make seed (posts sample events to /event)
- make runs (lists recent runs)
- make pr (simulates a PR CI event)
- make terraform (simulates infra plan/apply with cost guardrail)
- make kill (frees :8080 if busy)

## Environment

- `PORT` (optional)
- Secrets and external backends are stubbed for MVP.
- For GCP integrations: `GCP_PROJECT_ID`, and service account via ADC or env vars
- Optional: `GCM_MQL_QUERIES_JSON`, `SLACK_WEBHOOK_URL`, `GITHUB_TOKEN`

Notes:

- If you use Docker Compose, it reads `.env` and tries to expand `$VARS`. In `GCM_MQL_QUERIES_JSON`, escape dollars as `$$SERVICE` and `$$WINDOW_MIN` to silence compose warnings.
- If you see “Cannot find module '@google-cloud/storage'”, run `pnpm add @google-cloud/storage`.

## Structure

- `src/orchestrator.ts`: Express server and `/event` endpoint
- `src/runtime/*`: policy loader, LLM conductor shim, tool router
- `tools/*`: place concrete adapters (GitHub, K8s, Terraform, etc.)
- `runbooks/*`: incident response runbooks
- `.github/workflows/agentic-devops.yml`: event trigger example

## Endpoints

- `GET /healthz`: basic health check
- `POST /event`: send events (PR, deploy, incident, infra) as JSON
- `GET /runs`: recent runs (falls back to in-memory if Postgres is unavailable)

Sample payloads (see `samples/`):

- `pr-event.json` → triggers CI (`ci_run`) and PR comment
- `incident-event.json` → SRE Agent selects runbook and executes steps
- `deploy-event.json` → Release Agent staged rollout (staging → canary → prod)
- `terraform-event.json` → plan/apply with cost guardrail

Scripts (see `scripts/`):

- `simulate-pr.sh`, `simulate-incident.sh`, `simulate-deploy.sh`, `simulate-terraform.sh`
- `seed-events.sh` posts a couple of events to `/event`

## Local data & fallbacks

- With `DATABASE_URL` set, runs and tool calls persist to Postgres
- Without Postgres, the server uses an in-memory fallback so you can still develop
- Redis is optional; if missing, the queue is disabled automatically

## GCP wiring (optional)

- Set `GCP_PROJECT_ID` and authenticate (ADC) for:
  - Secrets: `@google-cloud/secret-manager`
  - Metrics: `@google-cloud/monitoring` (MQL in `GCM_MQL_QUERIES_JSON`)
  - Storage: `@google-cloud/storage` for `object_upload`
- Enable corresponding APIs in your project

## GitHub Actions integration

- Set `ORCH_URL` and `ORCH_TOKEN` as repository secrets
- The workflow `.github/workflows/agentic-devops.yml` posts PR/tag events to `/event`

## Troubleshooting

- Port in use: `lsof -ti :8080 | xargs kill -9 2>/dev/null || true` or run `PORT=8081 make dev`
- Compose warnings `SERVICE` / `WINDOW_MINm`: escape `$` as `$$` in `.env`
- Missing module errors: install required deps, e.g., `pnpm add @google-cloud/storage`
- Don't append comments after commands (e.g., avoid `pnpm install # first time only`)

## Testing

### Quick Validation

```bash
# Basic smoke test
make smoke

# Comprehensive system test
make test

# Test against local instance
make test-local

# Test against remote instance (set ORCH_URL)
make test-remote
```

### Test Coverage

The test suite validates:

- ✅ Health endpoints and basic connectivity
- ✅ Event processing for all agent types (CI, SRE, Release, Infrastructure)
- ✅ Policy enforcement and change window validation
- ✅ Data persistence and run tracking
- ✅ Tool execution and error handling
- ✅ API response structure and data validation

### Automated Testing

- **GitHub Actions**: Runs on every push/PR with Postgres/Redis services
- **Local Testing**: Use `make test` for full validation
- **CI Integration**: Tests build, lint, format, and system functionality

### Manual Testing

```bash
# Start the system
make up && make dev

# In another terminal, test endpoints
curl localhost:8080/healthz
curl localhost:8080/runs

# Test specific agents
make pr          # Test CI Agent
make terraform   # Test Infrastructure Agent
make seed        # Test all agents with sample data
```

## Next Steps

- Wire more real adapters under `tools/` (K8s, Terraform, GitHub, Slack, etc.)
- Expand `policy.precheck` for change windows, approvals, and SLO/security gates
