import { serverLogger } from './logger';

/**
 * Deliver a webhook notification to the given URL.
 * Retries once after 5 seconds on failure.
 */
export async function deliverWebhook(url: string, payload: object): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      serverLogger.info('Webhook delivery attempt', { url, attempt });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        serverLogger.info('Webhook delivered successfully', { url, status: res.status });
        return true;
      }

      serverLogger.warn('Webhook delivery got non-OK response', { url, status: res.status, attempt });
    } catch (error) {
      serverLogger.warn('Webhook delivery failed', { url, attempt, error: error instanceof Error ? error.message : 'Unknown error' });
    }

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  serverLogger.error('Webhook delivery failed after retries', undefined, { url });
  return false;
}
