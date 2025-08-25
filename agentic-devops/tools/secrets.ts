import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

export type SecretsGetParams = {
  path: string; // secret name, e.g., projects/PROJECT/secrets/NAME
  key: string; // version or logical key; for GSM we use version
};

export async function getSecret(params: SecretsGetParams): Promise<{ value?: string }> {
  const useGcp = process.env.GCP_PROJECT_ID;
  if (!useGcp) return {};
  const client = new SecretManagerServiceClient();
  const name = `${params.path}/versions/${params.key}`;
  const [accessResponse] = await client.accessSecretVersion({ name });
  const payload = accessResponse.payload?.data?.toString('utf8');
  return payload ? { value: payload } : {};
}
