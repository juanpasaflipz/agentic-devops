import { deploy, rollback } from '../../tools/k8s';
import { check } from '../../tools/metrics';

type ReleaseInput = {
  service: string;
  image: string;
  thresholds: Record<string, number>;
};

export async function runStagedRollout(
  input: ReleaseInput,
): Promise<{ ok: boolean; steps: string[] }> {
  const steps: string[] = [];
  // 1) Staging
  steps.push('deploy:staging');
  await deploy({ environment: 'staging', service: input.service, image: input.image });
  steps.push('metrics:staging');
  const s1 = await check({ service: input.service, window_min: 10, thresholds: input.thresholds });
  if (!s1.ok) {
    steps.push('rollback:staging');
    await rollback({ environment: 'staging', service: input.service });
    return { ok: false, steps };
  }

  // 2) Canary (5-10% simulated by setting replicas=1)
  steps.push('deploy:canary');
  await deploy({ environment: 'canary', service: input.service, image: input.image, replicas: 1 });
  steps.push('metrics:canary');
  const s2 = await check({ service: input.service, window_min: 20, thresholds: input.thresholds });
  if (!s2.ok) {
    steps.push('rollback:canary');
    await rollback({ environment: 'canary', service: input.service });
    return { ok: false, steps };
  }

  // 3) Full
  steps.push('deploy:prod');
  await deploy({ environment: 'prod', service: input.service, image: input.image });
  steps.push('metrics:prod');
  const s3 = await check({ service: input.service, window_min: 10, thresholds: input.thresholds });
  if (!s3.ok) {
    steps.push('rollback:prod');
    await rollback({ environment: 'prod', service: input.service });
    return { ok: false, steps };
  }

  return { ok: true, steps };
}
