import { Pool } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

export type DbClients = {
  pg: Pool | null;
  redis: ReturnType<typeof createClient> | null;
};

let clients: DbClients | null = null;

// In-memory fallback when DATABASE_URL is not set
type MemoryRun = {
  id: number;
  created_at: string;
  event: unknown;
  plan?: unknown;
  status?: string;
  approvals?: unknown;
  result?: unknown;
  links?: unknown;
};
const inMemoryRuns: MemoryRun[] = [];

export function getDb(): DbClients {
  if (clients) return clients;

  const pgUrl = process.env.DATABASE_URL;
  const redisUrl = process.env.REDIS_URL;

  const pg = pgUrl ? new Pool({ connectionString: pgUrl }) : null;
  const redis = redisUrl ? createClient({ url: redisUrl }) : null;

  clients = { pg, redis };
  return clients;
}

export async function initDb(): Promise<void> {
  const { pg, redis } = getDb();
  try {
    if (pg) {
      await pg.query(`
        create table if not exists runs (
          id bigserial primary key,
          created_at timestamptz default now(),
          event jsonb not null,
          plan jsonb,
          status text default 'pending',
          approvals jsonb
        );
      `);
      await pg.query(`alter table runs add column if not exists result jsonb`);
      await pg.query(`alter table runs add column if not exists links jsonb`);
      await pg.query(`
        create table if not exists tool_calls (
          id bigserial primary key,
          run_id bigint references runs(id) on delete set null,
          name text not null,
          params jsonb not null,
          result jsonb,
          status text default 'queued',
          error text,
          started_at timestamptz default now(),
          finished_at timestamptz,
          duration_ms integer
        );
      `);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      'Postgres unavailable, falling back to in-memory runs. Reason:',
      (e as Error)?.message,
    );
    if (clients) clients.pg = null;
  }
  try {
    if (redis) {
      await redis.connect();
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Redis unavailable, disabling queue. Reason:', (e as Error)?.message);
    if (clients) clients.redis = null;
  }
}

export async function createRun(event: unknown): Promise<number | null> {
  const { pg } = getDb();
  if (!pg) {
    const id = -(inMemoryRuns.length + 1);
    inMemoryRuns.unshift({ id, created_at: new Date().toISOString(), event, status: 'pending' });
    return id;
  }
  const res = await pg.query<{ id: number }>('insert into runs(event) values ($1) returning id', [
    JSON.stringify(event),
  ]);
  return res.rows[0]?.id ?? null;
}

export async function updateRun(
  id: number | null,
  fields: {
    status?: string;
    plan?: unknown;
    approvals?: unknown;
    result?: unknown;
    links?: unknown;
  },
): Promise<void> {
  const { pg } = getDb();
  if (id == null) return;
  if (!pg) {
    const idx = inMemoryRuns.findIndex((r) => r.id === id);
    if (idx >= 0) {
      const current = inMemoryRuns[idx];
      inMemoryRuns[idx] = { ...current, ...fields } as MemoryRun;
    }
    return;
  }
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (fields.status !== undefined) {
    sets.push(`status = $${i++}`);
    values.push(fields.status);
  }
  if (fields.plan !== undefined) {
    sets.push(`plan = $${i++}`);
    values.push(JSON.stringify(fields.plan));
  }
  if (fields.approvals !== undefined) {
    sets.push(`approvals = $${i++}`);
    values.push(JSON.stringify(fields.approvals));
  }
  if (fields.result !== undefined) {
    sets.push(`result = $${i++}`);
    values.push(JSON.stringify(fields.result));
  }
  if (fields.links !== undefined) {
    sets.push(`links = $${i++}`);
    values.push(JSON.stringify(fields.links));
  }
  if (sets.length === 0) return;
  values.push(id);
  const sql = `update runs set ${sets.join(', ')} where id = $${i}`;
  await pg.query(sql, values);
}

export async function listRuns(): Promise<
  Array<{
    id: number;
    created_at: string;
    event: unknown;
    status?: string;
    result?: unknown;
    links?: unknown;
  }>
> {
  const { pg } = getDb();
  if (!pg) {
    return inMemoryRuns.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      event: r.event,
      status: r.status,
      result: r.result,
      links: r.links,
    }));
  }
  const res = await pg.query<{
    id: number;
    created_at: string;
    event: unknown;
    status?: string;
    result?: unknown;
    links?: unknown;
  }>(
    'select id, created_at, event, status, result, links from runs order by created_at desc limit 50',
  );
  return res.rows;
}

export async function createToolCall(
  runId: number | null,
  name: string,
  params: Record<string, unknown>,
): Promise<number | null> {
  const { pg } = getDb();
  if (!pg) return null;
  const res = await pg.query<{ id: number }>(
    'insert into tool_calls(run_id, name, params, status) values ($1, $2, $3, $4) returning id',
    [runId, name, JSON.stringify(params), 'running'],
  );
  return res.rows[0]?.id ?? null;
}

export async function completeToolCall(
  id: number | null,
  fields: { result?: unknown; status: 'succeeded' | 'failed'; error?: string },
): Promise<void> {
  const { pg } = getDb();
  if (!pg || id == null) return;
  const values: unknown[] = [];
  let i = 1;
  const sets: string[] = [];
  if (fields.result !== undefined) {
    sets.push(`result = $${i++}`);
    values.push(JSON.stringify(fields.result));
  }
  sets.push(`status = $${i++}`);
  values.push(fields.status);
  if (fields.error !== undefined) {
    sets.push(`error = $${i++}`);
    values.push(fields.error);
  }
  sets.push('finished_at = now()');
  sets.push('duration_ms = extract(epoch from (now() - started_at)) * 1000');
  values.push(id);
  const sql = `update tool_calls set ${sets.join(', ')} where id = $${i}`;
  await pg.query(sql, values);
}
