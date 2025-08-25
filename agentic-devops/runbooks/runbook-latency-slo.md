---

id: runbook-latency-slo
title: Latency p95 Breach
severity: medium
match:
metric: http_latency_p95_ms
threshold: ">= 300ms for 10m"
steps:

- "metrics_check(service: {{service}}, window_min: 10)"
- "kubectl rollout status deploy/{{service}} -n {{env}}"
- "if recent deploy < 30m → k8s_rollback(environment: {{env}}, service: {{service}})"
- "notify(channel: '#ops', severity: 'error', message: 'Rolled back {{service}} {{env}} due to latency SLO breach')"
  postmortem_template: |

# Postmortem: {{service}} {{env}}

Timeline:
Impact:
Suspected Cause:
Remediation:
Follow-ups:
