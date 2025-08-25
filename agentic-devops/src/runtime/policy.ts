import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { DateTime } from 'luxon';
import { z } from 'zod';

export type Policy = {
  change_windows?: Record<string, { disallow: Array<{ from: string; to: string; tz: string }> }>;
  approvals?: Record<string, { low_risk: number; medium_risk: number; high_risk: number }>;
  slo_gates?: Record<
    string,
    { latency_p95_ms: number; error_rate_pct: number; cpu_saturation_pct: number }
  >;
  security?: { min_cvss: number; block_on_secrets_leak: boolean };
  canary?: { max_percent: number; window_min: number };
  cost?: { monthly_drift_pct_max: number };
  redaction?: { patterns: string[] };
};

let cachedPolicy: Policy | null = null;

export function loadPolicy(): Policy {
  if (cachedPolicy) return cachedPolicy;
  const file = path.resolve(process.cwd(), 'policy.yaml');
  if (!fs.existsSync(file)) {
    cachedPolicy = {};
    return cachedPolicy;
  }
  const yaml = fs.readFileSync(file, 'utf8');
  cachedPolicy = YAML.parse(yaml) as Policy;
  return cachedPolicy;
}

export function exportPolicy(): Policy {
  return loadPolicy();
}

export function precheckPolicy(event: unknown): { allowed: boolean; reason?: string } {
  const schema = z
    .object({
      action: z.string().optional(),
      environment: z.string().optional(),
      risk: z.enum(['low', 'medium', 'high']).optional(),
      approvals_count: z.number().int().nonnegative().optional(),
      nowIso: z.string().optional(),
    })
    .passthrough();

  const parsed = schema.safeParse(event);
  const evt = parsed.success ? parsed.data : {};
  const environment = (evt.environment as string | undefined) ?? 'dev';
  const action = (evt.action as string | undefined) ?? '';

  const policy = loadPolicy();

  // Change window precheck (applies to deploys or infra applies in prod)
  if (['deploy', 'release', 'infra_apply'].some((kind) => action.includes(kind))) {
    if (environment === 'prod' && isInDisallowedWindow(policy, environment, evt.nowIso)) {
      return { allowed: false, reason: 'Change window is closed for prod' };
    }
  }

  // Approvals gating by risk for prod
  if (environment === 'prod' && policy.approvals?.prod) {
    const required = getRequiredApprovals(policy, evt.risk);
    const have = evt.approvals_count ?? 0;
    if (have < required) {
      return {
        allowed: false,
        reason: `Insufficient approvals: required ${required}, have ${have}`,
      };
    }
  }

  return { allowed: true };
}

function getRequiredApprovals(policy: Policy, risk?: 'low' | 'medium' | 'high'): number {
  const prod = policy.approvals?.prod;
  if (!prod) return 0;
  if (risk === 'high') return prod.high_risk;
  if (risk === 'medium') return prod.medium_risk;
  return prod.low_risk;
}

function isInDisallowedWindow(policy: Policy, env: string, nowIso?: string): boolean {
  const windows = policy.change_windows?.[env]?.disallow ?? [];
  if (windows.length === 0) return false;
  for (const w of windows) {
    const tz = w.tz || 'UTC';
    const now = nowIso ? DateTime.fromISO(nowIso, { zone: tz }) : DateTime.now().setZone(tz);
    // Anchor start to most recent occurrence at/before now
    let start = dateTimeFromLabelSameWeek(now, w.from, tz);
    if (start > now) start = start.minus({ days: 7 });
    // Anchor end to the same week as start
    let end = dateTimeFromLabelSameWeek(start, w.to, tz);
    if (end <= start) end = end.plus({ days: 7 });
    if (now >= start && now < end) return true;
  }
  return false;
}

function dateTimeFromLabelSameWeek(ref: DateTime, label: string, tz: string): DateTime {
  const [dayStr, timeStr] = label.split(/\s+/);
  const [hourStr, minuteStr] = (timeStr ?? '00:00').split(':');
  const weekday = weekdayNumber(dayStr);
  return ref
    .set({ weekday, hour: Number(hourStr), minute: Number(minuteStr), second: 0, millisecond: 0 })
    .setZone(tz);
}

function weekdayNumber(day: string | undefined): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const map: Record<string, number> = {
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
    sun: 7,
  };
  const key = (day ?? 'mon').slice(0, 3).toLowerCase();
  const val = map[key] ?? 1;
  return val as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
