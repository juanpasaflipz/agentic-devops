import { v3 } from '@google-cloud/monitoring';

export type MetricsCheckParams = {
  service: string;
  window_min: number;
  thresholds: Record<string, number>;
};

// Template variables: $SERVICE, $WINDOW_MIN
// These are replaced with actual values when queries are executed
export async function check(
  params: MetricsCheckParams,
): Promise<{ ok: boolean; breaching?: string[] }> {
  const projectId = process.env.GCP_PROJECT_ID;
  const mqlJson = process.env.GCM_MQL_QUERIES_JSON;
  if (!projectId || !mqlJson) {
    // No GCP config → consider healthy in dev
    return { ok: true };
  }

  let queries: Record<string, string>;
  try {
    queries = JSON.parse(mqlJson) as Record<string, string>;
  } catch {
    return { ok: true };
  }

  const client = new v3.QueryServiceClient();
  const breaching: string[] = [];

  for (const [key, threshold] of Object.entries(params.thresholds)) {
    const q = queries[key];
    if (!q) continue;
    const query = q
      .replace(/\$SERVICE/g, params.service)
      .replace(/\$WINDOW_MIN/g, String(params.window_min));

    try {
      const [resp] = await client.queryTimeSeries({
        name: `projects/${projectId}`,
        query,
      });
      const value = extractSinglePointValue(resp as any);
      if (value != null && value > threshold) {
        breaching.push(key);
      }
    } catch {
      // On query error, skip; do not fail entire check
    }
  }

  return breaching.length ? { ok: false, breaching } : { ok: true };
}

function extractSinglePointValue(resp: any): number | null {
  const series = resp?.timeSeriesData?.[0];
  const point = series?.pointData?.[0];
  const values = point?.values;
  const val = values && values.length > 0 ? values[0] : undefined;
  if (!val) return null;
  if (typeof val.doubleValue === 'number') return val.doubleValue as number;
  if (val.int64Value != null) return Number(val.int64Value);
  const mean = val?.distributionValue?.mean;
  return typeof mean === 'number' ? mean : null;
}
