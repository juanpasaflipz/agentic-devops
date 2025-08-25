# Agentic DevOps Roadmap

This roadmap turns the blueprint into a phased plan with milestones, guardrails, and measurable outcomes. It should be maintained alongside implementation.

---

## Scope

- Build an event-driven "agentic DevOps" system that orchestrates CI/CD, IaC, guardrails, incident response, and communications.
- Operate with a central Conductor and specialized agents (CI, Release, Infra, SRE), with tools mapped to real backends.

---

## Timeline at a Glance

- Week 1: MVP orchestrator, policy, core tools, Release + SRE basics, replay tests.
- Weeks 2–3: Real cloud integrations (K8s/GCP/Secrets/Metrics), persistence (Postgres/Redis/Obj store).
- Weeks 4–5: Security hardening, approvals, progressive delivery, dashboards, documentation.
- Ongoing: Cost, scale, runbook library growth, game days.

---

## Milestones and Deliverables

### Phase 0 — Foundations (Days 1–2)

- [ ] Orchestrator `/event` endpoint responding to PR/tag/alert triggers
- [ ] Conductor prompt + planning flow (function-calling)
- [ ] `policy.yaml` (change windows, approvals, SLO/security, canary, cost, redaction)
- [ ] Tools: `notify`, `git_comment_pr` wired (dry-run ok)
- Acceptance criteria:
  - [ ] Policy precheck blocks disallowed changes and returns reason
  - [ ] PR comment + notify work in dry-run

### Phase 1 — CI Agent (Day 3)

- [ ] CI tool: `ci_run(test|build|sast|dast|sbom)` with artifact indexing
- [ ] PR comments for results, links to logs, SBOM summary
- Acceptance criteria:
  - [ ] Build/test runs on PR; result summarized as PR comment

### Phase 2 — Release Agent (Day 4)

- [ ] Default plan: staging → canary (≤10%) → full
- [ ] `k8s_deploy` + `metrics_check` (fake backend acceptable initially)
- [ ] Auto-rollback on SLO breach; `k8s_rollback` + `notify`
- Acceptance criteria:
  - [ ] Staged rollout simulation succeeds; rollback path verified

### Phase 3 — SRE Agent (Day 5)

- [ ] Runbook format + parser; at least 2 runbooks
- [ ] Incident handling workflow: classify → execute → postmortem stub
- Acceptance criteria:
  - [ ] Alert replay picks correct runbook and executes steps (dry-run ok)

### Phase 4 — Guardrails & Approvals (Day 6)

- [ ] Approval thresholds enforced by risk class
- [ ] Change windows honored with override mechanism
- [ ] Redaction in logs/tool outputs
- Acceptance criteria:
  - [ ] Blocked deploys during window; overrides logged; secrets redacted

### Phase 5 — Docs & Replay Tests (Day 7)

- [ ] README and contributor guide
- [ ] Replay harness with historical events
- [ ] Changelogs/release notes generation stub
- Acceptance criteria:
  - [ ] Replay suite passes; documentation links from PR comments

---

## Post‑MVP (Weeks 2–4)

### Phase 6 — Real Integrations & Persistence

- [ ] Kubernetes deploys to dev/staging/prod
- [ ] Metrics provider integration (Prometheus/Cloud Monitoring)
- [ ] Secrets manager integration
- [ ] Postgres (runs, plans, approvals), Redis (queues), Object storage (logs/artifacts)
- Acceptance criteria:
  - [ ] End-to-end deploy to staging from PR merge with metrics gates

### Phase 7 — Security & Policy

- [ ] Security gates (CVSS threshold), secret leak detection
- [ ] Binary Authorization/signing (Cosign) optional
- [ ] Policy Controller (OPA/Gatekeeper) policies: no :latest, resource limits, netpol
- Acceptance criteria:
  - [ ] Policy violations fail CI/CD with actionable guidance

### Phase 8 — Progressive Delivery & Approvals UX

- [ ] Canary promotion automation with metrics analysis
- [ ] Human-in-the-loop approvals via comments/slash-commands
- [ ] Rollback UX with rich notifications and links
- Acceptance criteria:
  - [ ] Canary promotion/rollback flows exercised under load test

---

## Operating Model

- Event sources: PRs, pushes/tags, CI status, alerts, manual `/deploy` and `/rollback`.
- Orchestrator enforces guardrails, delegates to agents, persists decisions/artifacts.
- Runbooks stored in `runbooks/` and versioned.

---

## Environments & Platform (target)

- GKE Autopilot (regional, private); namespaces: dev/staging/prod
- Gateway API/Ingress with managed TLS; private egress via Cloud NAT
- Artifact Registry for images/SBOM; Cloud Deploy for releases
- Observability: Managed Prometheus, Cloud Logging/Monitoring

---

## Guardrails (policy highlights)

- Change windows (no prod Fri 18:00–Mon 08:00 unless override)
- Approval thresholds by risk; SLO gates pre/post deploy
- Canary blast radius ≤ 10%; auto-rollback on SLO breach
- Cost guardrail: block infra changes with > X% MoM drift

---

## KPIs / Success Metrics

- Mean time to deploy (PR merge → prod) ≤ N minutes with gates
- Change failure rate ≤ X%; automatic rollback success rate ≥ Y%
- Mean time to detect (MTTD) and recover (MTTR) improved by ≥ Z%
- Policy violations caught pre-deploy; zero secret leaks in logs/PRs

---

## Risks & Mitigations

- Tool sprawl and rate limits → queueing, backoff, caching
- Flaky metrics or noisy alerts → thresholds, multi-signal validation, replay tests
- Secret exposure → strict redaction, secret scanning, least privilege
- Cost overruns → cost estimates in plans; drift monitoring and budgets

---

## Open Decisions

- Metrics provider default (Prometheus vs Cloud Monitoring)
- Canary mechanism (Cloud Deploy vs Argo Rollouts)
- SBOM signing and Binary Authorization rollout timing
- Ticketing system (Jira/Linear) integration scope for MVP

---

## References

- Blueprint: `devops-blueprint.md`
- Suggested file tree and policies: see sections 13–14 in the blueprint

---

## Maintenance

- Update this roadmap at the end of each milestone
- Link PRs/issues to checklist items; note deviations and rationale
