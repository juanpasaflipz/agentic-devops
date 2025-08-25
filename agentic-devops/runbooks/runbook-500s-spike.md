---

id: runbook-500s-spike
title: 500s Spike > X/min
severity: high
match:
metric: http_5xx_rate
threshold: ">= 1% for 5m"
steps:

- "metrics_check(service: {{service}}, window_min: 5)"
- "kubectl rollout status deploy/{{service}} -n {{env}}"
- "if recent deploy < 30m → k8s_rollback(environment: {{env}}, service: {{service}})"
- "notify(channel: '#ops', severity: 'critical', message: 'Rolled back {{service}} {{env}} due to 5xx spike')"
  postmortem_template: |

# Postmortem: {{service}} {{env}}

Timeline:
Impact:
Suspected Cause:
Remediation:
Follow-ups:
