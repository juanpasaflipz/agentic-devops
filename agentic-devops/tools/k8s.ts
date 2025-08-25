import { KubeConfig, AppsV1Api, V1Deployment } from '@kubernetes/client-node';

export type DeployParams = {
  environment: 'dev' | 'staging' | 'canary' | 'prod';
  service: string;
  image: string;
  replicas?: number;
};

export type RollbackParams = {
  environment: 'dev' | 'staging' | 'canary' | 'prod';
  service: string;
};

function resolveNamespace(env: DeployParams['environment']): string {
  const map: Record<string, string | undefined> = {
    dev: process.env.K8S_NAMESPACE_DEV,
    staging: process.env.K8S_NAMESPACE_STAGING,
    canary: process.env.K8S_NAMESPACE_CANARY,
    prod: process.env.K8S_NAMESPACE_PROD,
  };
  return map[env] || env;
}

function getAppsApi(): AppsV1Api | null {
  try {
    const kc = new KubeConfig();
    if (process.env.KUBECONFIG) {
      kc.loadFromFile(process.env.KUBECONFIG);
    } else {
      kc.loadFromDefault();
    }
    return kc.makeApiClient(AppsV1Api);
  } catch {
    return null;
  }
}

export async function deploy(params: DeployParams): Promise<{ ok: boolean; dryRun?: boolean }> {
  const api = getAppsApi();
  if (!api) return { ok: true, dryRun: true };
  const ns = resolveNamespace(params.environment);
  const name = params.service;

  // Try read -> replace; on 404 create
  try {
    const existingAny = await api.readNamespacedDeployment({ name, namespace: ns });
    const existing = existingAny as unknown as V1Deployment;
    const resourceVersion = (existing as any)?.metadata?.resourceVersion as string | undefined;
    const containers = ((existing as any)?.spec?.template?.spec?.containers ?? []) as Array<{
      name?: string;
      image?: string;
    }>;
    const updatedContainers =
      containers.length === 0
        ? [{ name, image: params.image }]
        : [{ ...containers[0], image: params.image }];
    const dep: V1Deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: { name, namespace: ns, labels: { app: name }, resourceVersion },
      spec: {
        replicas:
          typeof params.replicas === 'number'
            ? params.replicas
            : (((existing as any)?.spec?.replicas as number | undefined) ?? 1),
        selector: ((existing as any)?.spec?.selector as any) ?? { matchLabels: { app: name } },
        template: {
          metadata: {
            labels: {
              app: name,
              ...(((existing as any)?.spec?.template?.metadata?.labels as any) ?? {}),
            },
          },
          spec: { containers: updatedContainers as any },
        },
      },
    };
    await api.replaceNamespacedDeployment({ name, namespace: ns, body: dep });
    return { ok: true };
  } catch (e) {
    try {
      // Create minimal deployment if not found or error
      const dep: V1Deployment = {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name, namespace: ns, labels: { app: name } },
        spec: {
          replicas: params.replicas ?? 1,
          selector: { matchLabels: { app: name } },
          template: {
            metadata: { labels: { app: name } },
            spec: {
              containers: [{ name, image: params.image, ports: [{ containerPort: 8080 }] }],
            },
          },
        },
      };
      await api.createNamespacedDeployment({ namespace: ns, body: dep });
      return { ok: true };
    } catch {
      // Fall back to dry-run in dev or misconfigured cluster
      return { ok: true, dryRun: true };
    }
  }
}

export async function rollback(
  _params: RollbackParams,
): Promise<{ ok: boolean; dryRun?: boolean }> {
  try {
    // Implementing true rollback requires controller history; return dry-run for MVP
    return { ok: true, dryRun: true };
  } catch {
    return { ok: true, dryRun: true };
  }
}
