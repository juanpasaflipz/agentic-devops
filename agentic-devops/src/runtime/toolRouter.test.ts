import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toolRouter } from './toolRouter';

vi.mock('./db', () => ({
  createToolCall: vi.fn(async () => 1),
  completeToolCall: vi.fn(async () => {}),
}));

vi.mock('./queue', () => ({
  enqueueToolCall: vi.fn(async () => {}),
}));

vi.mock('../util/redact', () => ({
  redactText: (s: string) => s, // no-op to simplify assertions
}));

vi.mock('../../tools/notify', () => ({
  send: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../tools/github', () => ({
  commentPR: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../tools/metrics', () => ({
  check: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../tools/secrets', () => ({
  getSecret: vi.fn(async () => ({ value: 'x' })),
}));

vi.mock('../../tools/k8s', () => ({
  deploy: vi.fn(async () => ({ ok: true })),
  rollback: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../tools/ci', () => ({
  run: vi.fn(async () => ({ ok: true, url: 'https://ci.example/job' })),
}));

vi.mock('../../tools/terraform', () => ({
  plan: vi.fn(async () => ({ ok: true, plan_id: 'abc', cost_drift_pct: 1, diff_summary: 'x' })),
  apply: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../tools/storage', () => ({
  upload: vi.fn(async () => ({ ok: true })),
}));

describe('toolRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes notify', async () => {
    const res = await toolRouter('notify', { channel: 'dev', message: 'hi' }, 1);
    expect(res).toEqual({ ok: true });
  });

  it('routes git_comment_pr', async () => {
    const res = await toolRouter('git_comment_pr', { repo: 'owner/repo', pr: 1, body: 'hi' }, 1);
    expect(res).toEqual({ ok: true });
  });

  it('routes metrics_check', async () => {
    const res = await toolRouter(
      'metrics_check',
      { service: 'api', window_min: 5, thresholds: { error_rate: 1 } },
      1,
    );
    expect(res).toEqual({ ok: true });
  });

  it('routes secrets_get', async () => {
    const res = await toolRouter('secrets_get', { path: 'projects/p/secrets/x', key: '1' }, 1);
    expect(res).toEqual({ value: 'x' });
  });

  it('routes k8s_deploy and k8s_rollback', async () => {
    const dep = await toolRouter(
      'k8s_deploy',
      { environment: 'dev', service: 'svc', image: 'img:tag' },
      1,
    );
    expect(dep).toEqual({ ok: true });
    const rb = await toolRouter('k8s_rollback', { environment: 'dev', service: 'svc' }, 1);
    expect(rb).toEqual({ ok: true });
  });

  it('routes ci_run', async () => {
    const res = await toolRouter('ci_run', { pipeline: 'test', ref: 'main', repo: 'o/r' }, 1);
    expect(res).toMatchObject({ ok: true });
  });

  it('routes terraform plan/apply', async () => {
    const plan = await toolRouter('terraform_plan', { workspace: 'w', dir: '.' }, 1);
    expect(plan).toMatchObject({ ok: true });
    const apply = await toolRouter(
      'terraform_apply',
      { workspace: 'w', dir: '.', plan_id: 'abc' },
      1,
    );
    expect(apply).toEqual({ ok: true });
  });

  it('routes object_upload', async () => {
    const res = await toolRouter('object_upload', {
      bucket: 'b',
      object: 'o',
      data: 'd',
    });
    expect(res).toEqual({ ok: true });
  });

  it('returns error object for unknown tools in dev', async () => {
    await expect(toolRouter('unknown_tool', {}, 1)).rejects.toThrowError(/Unknown tool/);
  });
});
