import { redactText } from '../util/redact';
import { commentPR } from '../../tools/github';
import { send } from '../../tools/notify';
import { check } from '../../tools/metrics';
import { getSecret } from '../../tools/secrets';
import { deploy, rollback } from '../../tools/k8s';
import { run as ciRun } from '../../tools/ci';
import { plan as tfPlan, apply as tfApply } from '../../tools/terraform';
import { upload as storageUpload } from '../../tools/storage';
import { enqueueToolCall } from '../runtime/queue';
import { createToolCall, completeToolCall } from '../runtime/db';

type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

const handlers: Record<string, ToolHandler> = {
  // Implementations are wired under tools/
  git_comment_pr: async (params) => {
    const { repo, pr, body } = params as { repo: string; pr: number; body: string };
    return commentPR({ repo, pr, body });
  },
  notify: async (params) => {
    const { channel, severity, message } = params as {
      channel: string;
      severity?: 'info' | 'warn' | 'error' | 'critical';
      message: string;
    };
    return send({ channel, severity, message });
  },
  metrics_check: async (params) => {
    const { service, window_min, thresholds } = params as {
      service: string;
      window_min: number;
      thresholds: Record<string, number>;
    };
    return check({ service, window_min, thresholds });
  },
  secrets_get: async (params) => {
    const { path, key } = params as { path: string; key: string };
    return getSecret({ path, key });
  },
  k8s_deploy: async (params) => {
    const { environment, service, image, replicas } = params as {
      environment: 'dev' | 'staging' | 'canary' | 'prod';
      service: string;
      image: string;
      replicas?: number;
    };
    return deploy({ environment, service, image, replicas });
  },
  k8s_rollback: async (params) => {
    const { environment, service } = params as {
      environment: 'dev' | 'staging' | 'canary' | 'prod';
      service: string;
    };
    return rollback({ environment, service });
  },
  ci_run: async (params) => {
    const { pipeline, ref, repo } = params as {
      pipeline: 'test' | 'build' | 'sast' | 'dast' | 'sbom';
      ref: string;
      repo: string;
    };
    return ciRun({ pipeline, ref, repo });
  },
  terraform_plan: async (params) => {
    const { workspace, dir } = params as { workspace: string; dir: string };
    return tfPlan({ workspace, dir });
  },
  terraform_apply: async (params) => {
    const { workspace, dir, plan_id } = params as {
      workspace: string;
      dir: string;
      plan_id: string;
    };
    return tfApply({ workspace, dir, plan_id });
  },
  object_upload: async (params) => {
    const { bucket, object, data, contentType } = params as {
      bucket: string;
      object: string;
      data: string;
      contentType?: string;
    };
    return storageUpload({ bucket, object, data, contentType });
  },
};

export async function toolRouter(
  name: string,
  params: Record<string, unknown>,
  runId?: number | null,
): Promise<unknown> {
  const handler = handlers[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  // Enqueue a record for observability even if we execute inline
  await enqueueToolCall(name, params);
  const toolId = await createToolCall(runId ?? null, name, params);
  try {
    const result = await handler(params);
    await completeToolCall(toolId, { status: 'succeeded', result });
    const redacted = redactText(JSON.stringify(result));
    return JSON.parse(redacted);
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown_error';
    await completeToolCall(toolId, { status: 'failed', error });
    // Swallow tool errors in dev to avoid breaking flows
    if (process.env.NODE_ENV !== 'production') {
      return { ok: false, error };
    }
    throw err;
  }
}
