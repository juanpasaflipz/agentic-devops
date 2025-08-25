export type ConductorInput = {
  event: unknown;
  context: unknown;
  guardrails: unknown;
};

export type Plan = {
  summary?: string;
};

export type ToolRouter = (
  name: string,
  params: Record<string, unknown>,
  runId?: number | null,
) => Promise<unknown>;

export async function callLLMConductor(
  input: ConductorInput,
  _toolRouter: ToolRouter,
  runId?: number | null,
): Promise<Plan> {
  // TODO: Implement LLM-based planning logic
  // For now, route events to appropriate agents based on event type
  const evt = (input.event as Record<string, unknown>) ?? {};
  if (evt?.action === 'deploy' && evt?.service && evt?.image) {
    const { runStagedRollout } = await import('../agents/releaseAgent');
    const guardrails = input.guardrails as Record<string, unknown>;
    const sloGates = guardrails?.slo_gates as Record<string, unknown> | undefined;
    const defaultThresholds: Record<string, number> = {
      latency_p95_ms: 300,
      error_rate_pct: 0.5,
      cpu_saturation_pct: 85,
    };
    const thresholds = (sloGates?.default as Record<string, number>) ?? defaultThresholds;
    const result = await runStagedRollout({
      service: evt.service as string,
      image: evt.image as string,
      thresholds,
    });
    return {
      summary: result.ok
        ? 'Deployment succeeded'
        : `Deployment failed: ${result.steps.join(' -> ')}`,
    };
  }
  if (evt?.action === 'ci' && evt?.repo && evt?.ref && evt?.pipeline) {
    const result = (await _toolRouter(
      'ci_run',
      { pipeline: evt.pipeline, ref: evt.ref, repo: evt.repo },
      runId,
    )) as Record<string, unknown>;
    const pr = evt?.pr as Record<string, unknown> | undefined;
    const prNumber = pr?.number;
    if (prNumber) {
      const body = `CI ${evt.pipeline} result: ${result?.ok ? 'success' : 'failure'}${result?.url ? ` - ${result.url}` : ''}`;
      await _toolRouter('git_comment_pr', { repo: evt.repo, pr: prNumber, body }, runId);
    }
    return { summary: `CI ${evt.pipeline} ${result?.ok ? 'succeeded' : 'failed'}` };
  }
  if (evt?.action === 'incident' && evt?.service && evt?.metric) {
    const { handleIncident } = await import('../agents/sreAgent');
    const res = await handleIncident(
      {
        service: evt.service as string,
        env: (evt.env as string) ?? 'prod',
        metric: evt.metric as string,
        severity: (evt.severity as 'low' | 'medium' | 'high' | 'critical') ?? 'high',
      },
      _toolRouter,
      runId,
    );
    const severity = evt.severity ?? 'high';
    const message = res.ok
      ? `Incident handled: ${evt.metric} for ${evt.service} (${severity}). Runbook=${res.runbook}`
      : `Incident handling failed: ${evt.metric} for ${evt.service}`;
    await _toolRouter(
      'notify',
      { channel: '#ops', severity: res.ok ? 'error' : 'critical', message },
      runId,
    );
    return { summary: res.ok ? `Incident handled via ${res.runbook}` : 'Incident handling failed' };
  }
  if (evt?.action === 'infra_plan_apply' && evt?.workspace && evt?.dir) {
    const planRes = (await _toolRouter(
      'terraform_plan',
      { workspace: evt.workspace, dir: evt.dir },
      runId,
    )) as Record<string, unknown>;
    const guardrails = input.guardrails as Record<string, unknown>;
    const cost = guardrails?.cost as Record<string, unknown> | undefined;
    const maxPct = (cost?.monthly_drift_pct_max as number) ?? 10;
    const costDriftPct = planRes.cost_drift_pct as number;
    if (costDriftPct > maxPct) {
      return { summary: `Infra plan blocked: cost drift ${costDriftPct}% > max ${maxPct}%` };
    }
    await _toolRouter(
      'terraform_apply',
      { workspace: evt.workspace, dir: evt.dir, plan_id: planRes.plan_id },
      runId,
    );
    return { summary: `Infra applied (plan_id=${planRes.plan_id})` };
  }
  void _toolRouter;
  void runId;
  return { summary: 'No action taken.' };
}
