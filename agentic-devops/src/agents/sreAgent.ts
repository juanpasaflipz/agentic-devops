import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

type Incident = {
  service: string;
  env: string;
  metric: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

type ToolRouter = (
  name: string,
  params: Record<string, unknown>,
  runId?: number | null,
) => Promise<unknown>;

export async function handleIncident(
  incident: Incident,
  toolRouter: ToolRouter,
  runId?: number | null,
): Promise<{ ok: boolean; runbook?: string }> {
  const runbooksDir = path.resolve(process.cwd(), 'runbooks');
  const files = fs.readdirSync(runbooksDir).filter((f) => f.endsWith('.md'));
  const selected = selectRunbook(files, incident.metric);
  const rbPath = path.join(runbooksDir, selected);
  const content = fs.readFileSync(rbPath, 'utf8');
  const rb = YAML.parse(content) as { steps?: string[] };
  const steps = rb.steps ?? [];

  for (const raw of steps) {
    const step = template(raw, incident);
    const call = parseCall(step);
    if (!call) continue;
    const [name, params] = call;
    try {
      await toolRouter(name, params, runId ?? null);
    } catch {
      // Continue to next step; rollback steps are included in runbooks
    }
  }
  return { ok: true, runbook: selected };
}

function selectRunbook(files: string[], metric: string): string {
  const byMetric = files.find((f) => f.includes('500s') && metric.includes('5xx'));
  return byMetric ?? files[0];
}

function template(s: string, vars: Record<string, unknown>): string {
  return s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) =>
    String((vars as Record<string, unknown>)[k] ?? ''),
  );
}

function parseCall(step: string): [string, Record<string, unknown>] | null {
  // Example: metrics_check(service: checkout, window_min: 5)
  const m = step.match(/^(\w+)\s*\((.*)\)\s*$/);
  if (!m) return null;
  const name = m[1];
  const args = m[2].trim();
  const params: Record<string, unknown> = {};
  if (args.length > 0) {
    for (const part of splitArgs(args)) {
      const kv = part.split(':');
      if (kv.length >= 2) {
        const key = kv[0].trim();
        const valRaw = kv.slice(1).join(':').trim();
        params[key] = coerce(valRaw);
      }
    }
  }
  return [name, params];
}

function splitArgs(s: string): string[] {
  // Split by commas not inside quotes
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (const ch of s) {
    if (ch === '"' || ch === "'") inQuote = !inQuote;
    if (ch === ',' && !inQuote) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function coerce(v: string): unknown {
  if (/^\d+$/.test(v)) return Number(v);
  if (/^\d+\.\d+$/.test(v)) return Number(v);
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v.replace(/^['"]|['"]$/g, '');
}
