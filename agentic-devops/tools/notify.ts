import axios from 'axios';

export type NotifyParams = {
  channel: string; // Slack channel name or webhook URL alias
  severity?: 'info' | 'warn' | 'error' | 'critical';
  message: string;
};

export async function send(params: NotifyParams): Promise<{ ok: boolean }> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  const isPlaceholder =
    !webhook ||
    webhook.includes('hooks.slack.com/services/YOUR/WEBHOOK/URL') ||
    webhook.includes('your_webhook_url_here');
  if (!webhook || isPlaceholder) {
    return { ok: true };
  }
  const text = params.severity
    ? `[${params.severity.toUpperCase()}] ${params.message}`
    : params.message;
  await axios.post(webhook, { text });
  return { ok: true };
}
