# Agentic DevOps (MVP)

**Agentic DevOps** is an **event-driven orchestration framework** that combines AI-powered planning with DevOps automation.

This project provides:
- ⚡ **Event-driven workflows**: Handle CI/CD, infrastructure changes, incidents, and metrics through event simulation and orchestration.
- 🧠 **Conductor + Tool Router**: A minimal LLM-based conductor that interprets events, applies policies (`policy.yaml`), and routes tasks to the right DevOps tools.
- 🔧 **Extensible integrations**: Includes adapters for GitHub, Kubernetes, metrics systems, and more.
- 📘 **Runbooks & Guardrails**: Predefined `runbooks/` and policies for reproducibility, safety, and cost controls.
- 🚀 **MVP-first design**: Lightweight, opinionated setup to bootstrap an intelligent DevOps system in minutes.

### Typical Use Cases
- Automating **CI/CD workflows** with AI-driven decision-making.
- Managing **cloud infrastructure events** (Terraform plans, cost guardrails, etc.).
- Handling **incidents and SRE tasks** with runbook-driven responses.
- Experimenting with **agentic AI in DevOps pipelines**.

This repo is intended for developers, SREs, and researchers who want to explore the intersection of **LLMs, agents, and DevOps automation**.

---

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
- Don’t append comments after commands (e.g., avoid `pnpm install # first time only`)

## Next Steps

- Wire more real adapters under `tools/` (K8s, Terraform, GitHub, Slack, etc.)
- Expand `policy.precheck` for change windows, approvals, and SLO/security gates
