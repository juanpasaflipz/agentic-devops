import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { precheckPolicy, exportPolicy } from './runtime/policy';
import { callLLMConductor } from './runtime/llm';
import { toolRouter } from './runtime/toolRouter';
import { initDb, createRun, updateRun, listRuns } from './runtime/db';

dotenv.config();

const app = express();
app.use(bodyParser.json());

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).send({ status: 'ok' });
});

app.post('/event', async (req: Request, res: Response) => {
  const event = req.body;
  try {
    await initDb();
    const runId = await createRun(event);
    const pre = precheckPolicy(event);
    if (!pre.allowed) {
      await updateRun(runId, { status: 'blocked' });
      return res.status(200).send({ action: 'blocked', reason: pre.reason });
    }

    const plan = await callLLMConductor(
      {
        event,
        context: {},
        guardrails: exportPolicy(),
      },
      toolRouter,
      runId,
    );
    await updateRun(runId, { status: 'completed', plan, result: { summary: plan.summary } });
    res.status(200).send({ status: 'ok', runId, planSummary: plan.summary ?? 'no summary' });
  } catch (err) {
    // Avoid leaking secrets
    const message = err instanceof Error ? err.message : 'unknown_error';
    // eslint-disable-next-line no-console
    console.error('Error handling /event:', message);
    res.status(500).send({
      error: 'internal_error',
      detail: process.env.NODE_ENV === 'production' ? undefined : message,
    });
  }
});

app.get('/runs', async (_req: Request, res: Response) => {
  try {
    await initDb();
    const rows = await listRuns();
    res.status(200).send(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    // eslint-disable-next-line no-console
    console.error('Error handling /runs:', message);
    res.status(500).send({ error: 'internal_error' });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Orchestrator listening on :${port}`);
});
