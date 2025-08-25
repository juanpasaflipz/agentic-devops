# Contributing

## Prereqs

- Node 18+ and pnpm
- Docker (optional for Postgres/Redis)

## Setup

- pnpm install
- cp .env.example .env (fill in creds if available)
- make up (starts Postgres/Redis) — optional
- make dev (starts server on :8080)

## Quick checks

- curl http://localhost:8080/healthz
- make seed && make runs
- make pr (CI simulation)
- make terraform (infra plan/apply simulation)

## Development tips

- Tools are stubbed; in dev, external calls are no-ops if creds are placeholders
- /runs lists recent runs (in-memory fallback when DB not configured)
- Use scripts in scripts/ and samples/ to simulate flows

## Coding standards

- TypeScript strict mode; run pnpm build and pnpm lint
- Keep policies in policy.yaml and runbooks under runbooks/
- Avoid secrets in logs; redaction patterns are in policy.yaml and util/redact
