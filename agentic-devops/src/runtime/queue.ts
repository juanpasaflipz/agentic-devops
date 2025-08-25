import { getDb } from './db';

const DEFAULT_QUEUE = 'tool-calls';

export async function enqueueToolCall(
  name: string,
  params: Record<string, unknown>,
): Promise<void> {
  const { redis } = getDb();
  if (!redis) return; // dev mode without redis
  const payload = JSON.stringify({ name, params, enqueued_at: Date.now() });
  await redis.lPush(DEFAULT_QUEUE, payload);
}

export async function dequeueToolCall(): Promise<{
  name: string;
  params: Record<string, unknown>;
} | null> {
  const { redis } = getDb();
  if (!redis) return null;
  const res = await redis.brPop(DEFAULT_QUEUE, 1);
  if (!res) return null;
  try {
    const parsed = JSON.parse(res.element) as { name: string; params: Record<string, unknown> };
    return parsed;
  } catch {
    return null;
  }
}
