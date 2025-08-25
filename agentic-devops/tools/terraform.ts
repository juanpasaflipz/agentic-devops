import crypto from 'crypto';

export type TerraformPlanParams = {
  workspace: string;
  dir: string;
};

export type TerraformApplyParams = {
  workspace: string;
  dir: string;
  plan_id: string;
};

export async function plan(params: TerraformPlanParams): Promise<{
  ok: boolean;
  plan_id: string;
  cost_drift_pct: number;
  diff_summary: string;
}> {
  // Stub: generate a stable plan id and read cost drift from env or default 5%
  const plan_id = crypto
    .createHash('sha1')
    .update(`${params.workspace}:${params.dir}:${Date.now()}`)
    .digest('hex')
    .slice(0, 12);
  const cost = Number(process.env.TF_MOCK_COST_PCT ?? '5');
  const diff_summary = `Resources to add: 1, change: 0, destroy: 0`;
  return { ok: true, plan_id, cost_drift_pct: cost, diff_summary };
}

export async function apply(_params: TerraformApplyParams): Promise<{ ok: boolean }> {
  // Stub: assume success
  return { ok: true };
}
