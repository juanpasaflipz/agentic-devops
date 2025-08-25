import { initDb, createRun, updateRun } from '../src/runtime/db';

async function main() {
  await initDb();
  const event = { source: 'seed', action: 'ci', repo: 'acme/shop', ref: 'refs/heads/main' };
  const runId = await createRun(event);
  await updateRun(runId, { status: 'completed', result: { summary: 'Seeded run' } });
  // eslint-disable-next-line no-console
  console.log('Seeded run id', runId);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
