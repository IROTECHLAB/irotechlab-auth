import { createHmac, randomBytes } from 'crypto';
import { sql } from './db';
import { validateWebhookUrl } from './webhook-url';

export type WebhookEvent =
  | 'user.authorized'
  | 'user.revoked'
  | 'user.revoked_all'
  | 'refresh_token.rotated'
  | 'client.updated'
  | 'client.disabled'
  | 'client.deleted'
  | 'email.verified'
  | 'ping';

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
  'user.authorized',
  'user.revoked',
  'user.revoked_all',
  'refresh_token.rotated',
  'client.updated',
  'client.disabled',
  'client.deleted',
  'email.verified',
];

export function generateWebhookSecret(): string {
  return 'iro_whsec_' + randomBytes(24).toString('base64url');
}

function sign(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * Fire a webhook to every active endpoint registered for this client that
 * subscribes to the given event.
 */
export async function emitWebhook(
  clientId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const endpoints = (await sql`
    SELECT id, url, secret
    FROM webhook_endpoints
    WHERE client_id = ${clientId}
      AND is_active = TRUE
      AND ${event} = ANY(events)
  `) as { id: string; url: string; secret: string }[];

  if (endpoints.length === 0) return;

  await Promise.all(
    endpoints.map((ep) => deliver(ep, event, data))
  );
}

/**
 * Broadcast to every client that has authorized the given user.
 * Use when the event isn't tied to a single client (e.g. email.verified).
 */
export async function emitWebhookToUserClients(
  userId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const rows = (await sql`
    SELECT DISTINCT client_id
    FROM user_authorized_apps
    WHERE user_id = ${userId}
  `) as { client_id: string }[];

  await Promise.all(
    rows.map((r) => emitWebhook(r.client_id, event, data))
  );
}

async function deliver(
  endpoint: { id: string; url: string; secret: string },
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  // Re-validate at delivery time to defeat DNS rebinding:
  // a URL that resolved to a public IP at registration could now
  // resolve to a private IP.
  const urlCheck = await validateWebhookUrl(endpoint.url);
  if (!urlCheck.ok) {
    console.warn('[webhook] blocked delivery to', endpoint.url, '-', urlCheck.reason);
    await sql`
      INSERT INTO webhook_deliveries (
        endpoint_id, event, payload, status_code, error
      ) VALUES (
        ${endpoint.id}, ${event}, ${JSON.stringify(data)}, 0,
        ${'blocked: ' + (urlCheck.reason ?? 'invalid url')}
      )
    `;
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const deliveryId = randomBytes(8).toString('hex');
  const body = JSON.stringify({
    id: deliveryId,
    event,
    created_at: new Date().toISOString(),
    data,
  });
  const signature = sign(endpoint.secret, timestamp, body);

  let status = 0;
  let responseBody = '';
  let error: string | null = null;

  try {
    const res = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IrotechLab-Webhooks/1.0',
        'X-Iro-Event': event,
        'X-Iro-Delivery': deliveryId,
        'X-Iro-Timestamp': String(timestamp),
        'X-Iro-Signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    responseBody = (await res.text()).slice(0, 1000);
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (e: any) {
    error = e?.message ?? String(e);
  }

  const success = status >= 200 && status < 300;

  await sql`
    INSERT INTO webhook_deliveries (
      endpoint_id, event, payload, status_code, response_body, error, delivered_at
    )
    VALUES (
      ${endpoint.id},
      ${event},
      ${JSON.stringify(data)},
      ${status},
      ${responseBody},
      ${error},
      ${success ? new Date().toISOString() : null}
    )
  `;

  await sql`
    UPDATE webhook_endpoints SET
      last_success_at = CASE WHEN ${success} THEN NOW() ELSE last_success_at END,
      last_failure_at = CASE WHEN NOT ${success} THEN NOW() ELSE last_failure_at END,
      last_error = ${error},
      failure_count = CASE WHEN ${success} THEN 0 ELSE failure_count + 1 END
    WHERE id = ${endpoint.id}
  `;
}
