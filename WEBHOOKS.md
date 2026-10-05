<h1 align="center">Webhooks — Integration Guide</h1>

<p align="center">
  <strong>Receive real-time events from IrotechLab Auth when users authorize or revoke your app.</strong>
</p>

<p align="center">
  <a href="https://auth.irotechlab.xi.to/developer">Developer Portal</a> ·
  <a href="https://auth.irotechlab.xi.to">Live Provider</a>
</p>

---

<h2>Table of contents</h2>

<ol>
  <li><a href="#overview">Overview</a></li>
  <li><a href="#quick-start">Quick start</a></li>
  <li><a href="#events">Events</a></li>
  <li><a href="#payload-format">Payload format</a></li>
  <li><a href="#verifying-signatures">Verifying signatures</a></li>
  <li><a href="#handling-events">Handling events</a></li>
  <li><a href="#retry-and-failure-behavior">Retry and failure behavior</a></li>
  <li><a href="#secret-rotation">Secret rotation</a></li>
  <li><a href="#testing">Testing</a></li>
  <li><a href="#code-examples">Code examples</a></li>
  <li><a href="#security-checklist">Security checklist</a></li>
  <li><a href="#troubleshooting">Troubleshooting</a></li>
  <li><a href="#faq">FAQ</a></li>
</ol>

---

<h2 id="overview">Overview</h2>

<p>Webhooks let your server receive real-time notifications from IrotechLab Auth. Instead of polling our API to check whether a user revoked access, we <strong>push</strong> the event to you the moment it happens.</p>

<p>Every webhook request is:</p>
<ul>
  <li><strong>Signed</strong> with HMAC-SHA256 so you can verify it came from us</li>
  <li><strong>Timestamped</strong> so you can reject stale or replayed requests</li>
  <li><strong>Logged</strong> in the developer portal with delivery status and response bodies</li>
</ul>

<p>Common use cases:</p>
<ul>
  <li>Immediately invalidate a user's session when they revoke your app's access</li>
  <li>Log user activity (authorized, revoked) to your analytics</li>
  <li>Send a welcome message when a user authorizes for the first time</li>
  <li>Kill all user sessions when an admin revokes everyone from the app's dashboard</li>
</ul>

---

<h2 id="quick-start">Quick start</h2>

<h3>1. Register an endpoint</h3>

<ol>
  <li>Sign in at <a href="https://auth.irotechlab.xi.to">auth.irotechlab.xi.to</a></li>
  <li>Open <a href="https://auth.irotechlab.xi.to/developer">/developer</a> and pick your app</li>
  <li>Scroll to <strong>Webhooks</strong> → click <strong>Add webhook</strong></li>
  <li>Enter your HTTPS endpoint URL (e.g. <code>https://yourapp.com/webhooks/iro</code>)</li>
  <li>Choose which events to subscribe to</li>
  <li>Click <strong>Create webhook</strong></li>
  <li><strong>Copy the signing secret</strong> — it's shown once</li>
</ol>

<h3>2. Build a receiver</h3>

<p>Your endpoint receives <code>POST</code> requests with a JSON body. Respond with <code>200</code> within 10 seconds to acknowledge receipt.</p>

<p><strong>Python (Flask):</strong></p>

<pre><code>import hmac, hashlib, time, os
from flask import Flask, request

app = Flask(__name__)
IRO_WEBHOOK_SECRET = os.environ['IRO_WEBHOOK_SECRET']

def verify(body: str, timestamp: str, signature: str) -> bool:
    if abs(time.time() - int(timestamp)) > 300:
        return False
    expected = hmac.new(
        IRO_WEBHOOK_SECRET.encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature.replace('sha256=', ''))

@app.post('/webhooks/iro')
def iro_webhook():
    body = request.get_data(as_text=True)
    ts = request.headers.get('X-Iro-Timestamp', '0')
    sig = request.headers.get('X-Iro-Signature', '')

    if not verify(body, ts, sig):
        return '', 401

    event = request.headers.get('X-Iro-Event')
    data = request.get_json()['data']

    if event == 'user.revoked_all':
        # Revoke everything for this app
        Session.query.filter_by(provider='iro').delete()
    elif event == 'user.revoked':
        Session.query.filter_by(user_id=data['user_id']).delete()

    return '', 200</code></pre>

<h3>3. Test it</h3>

<p>In the developer portal, click <strong>Test</strong> on your webhook. This fires a <code>ping</code> event to your endpoint.</p>

<ul>
  <li><strong>Green flash "Test delivered — HTTP 200"</strong> → success</li>
  <li><strong>Red flash with an error</strong> → check the <strong>Deliveries</strong> button for details</li>
</ul>

---

<h2 id="events">Events</h2>

<table>
  <thead>
    <tr><th>Event</th><th>When it fires</th><th>Payload fields</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>user.authorized</code></td>
      <td>A user approved your app on the consent screen (first time or after re-authorization)</td>
      <td><code>user_id</code>, <code>scopes</code>, <code>authorized_at</code></td>
    </tr>
    <tr>
      <td><code>user.revoked</code></td>
      <td>A user revoked your app's access from their account page</td>
      <td><code>user_id</code>, <code>revoked_at</code></td>
    </tr>
    <tr>
      <td><code>user.revoked_all</code></td>
      <td>The app owner clicked <strong>Revoke all</strong> on the developer page</td>
      <td><code>revoked_count</code>, <code>revoked_at</code></td>
    </tr>
    <tr>
      <td><code>refresh_token.rotated</code></td>
      <td>A refresh token was used and rotated</td>
      <td><code>user_id</code>, <code>rotated_at</code></td>
    </tr>
    <tr>
      <td><code>client.updated</code></td>
      <td>App settings changed via the developer portal</td>
      <td><code>changed_fields</code>, <code>updated_at</code></td>
    </tr>
    <tr>
      <td><code>client.disabled</code></td>
      <td>App was paused / deactivated</td>
      <td><code>disabled_at</code></td>
    </tr>
    <tr>
      <td><code>client.deleted</code></td>
      <td>App was deleted</td>
      <td><code>deleted_at</code></td>
    </tr>
    <tr>
      <td><code>email.verified</code></td>
      <td>A user verified their email address</td>
      <td><code>user_id</code>, <code>verified_at</code></td>
    </tr>
    <tr>
      <td><code>ping</code></td>
      <td>Sent by the <strong>Test</strong> button — always subscribed automatically</td>
      <td><code>message</code>, <code>sent_at</code></td>
    </tr>
  </tbody>
</table>

<p><strong>The three most important events</strong> for keeping state in sync:</p>
<ul>
  <li><code>user.revoked</code> — kill that user's session in your app</li>
  <li><code>user.revoked_all</code> — kill every session in your app</li>
  <li><code>user.authorized</code> — send a welcome, log activity, sync state</li>
</ul>

---

<h2 id="payload-format">Payload format</h2>

<p>Every delivery is a POST with a JSON body:</p>

<pre><code>POST /webhooks/iro HTTP/1.1
Host: yourapp.com
Content-Type: application/json
User-Agent: IrotechLab-Webhooks/1.0
X-Iro-Event: user.revoked_all
X-Iro-Delivery: a1b2c3d4e5f6a7b8
X-Iro-Timestamp: 1790840000
X-Iro-Signature: sha256=8a7f3c...

{
  "id": "a1b2c3d4e5f6a7b8",
  "event": "user.revoked_all",
  "created_at": "2026-10-01T17:39:14.000Z",
  "data": {
    "revoked_count": 5,
    "revoked_at": "2026-10-01T17:39:14.000Z"
  }
}</code></pre>

<h3>Headers</h3>

<table>
  <thead>
    <tr><th>Header</th><th>Purpose</th></tr>
  </thead>
  <tbody>
    <tr><td><code>X-Iro-Event</code></td><td>The event name — use this to route to a handler</td></tr>
    <tr><td><code>X-Iro-Delivery</code></td><td>Unique ID for this delivery — use it to deduplicate</td></tr>
    <tr><td><code>X-Iro-Timestamp</code></td><td>Unix timestamp (seconds) when the request was signed</td></tr>
    <tr><td><code>X-Iro-Signature</code></td><td>HMAC-SHA256 signature — verify before trusting the body</td></tr>
  </tbody>
</table>

<h3>Body</h3>

<table>
  <thead>
    <tr><th>Field</th><th>Type</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td><code>id</code></td><td>string</td><td>Unique delivery ID — stable across retries</td></tr>
    <tr><td><code>event</code></td><td>string</td><td>Event name (same as <code>X-Iro-Event</code>)</td></tr>
    <tr><td><code>created_at</code></td><td>ISO 8601</td><td>When the event was emitted</td></tr>
    <tr><td><code>data</code></td><td>object</td><td>Event-specific fields — see the events table above</td></tr>
  </tbody>
</table>

---

<h2 id="verifying-signatures">Verifying signatures</h2>

<p><strong>Always verify the signature.</strong> Without it, anyone who knows your webhook URL can send fake events.</p>

<p>The signature is <code>HMAC-SHA256(secret, timestamp + "." + body)</code> where:</p>
<ul>
  <li><code>secret</code> is the value shown once when you created the webhook</li>
  <li><code>timestamp</code> is the value of the <code>X-Iro-Timestamp</code> header as a string</li>
  <li><code>body</code> is the raw request body (not parsed)</li>
</ul>

<h3>Node.js</h3>

<pre><code>import crypto from 'crypto';
import express from 'express';

const app = express();

// IMPORTANT: capture the raw body for signature verification
app.use('/webhooks/iro', express.raw({ type: 'application/json' }));

app.post('/webhooks/iro', (req, res) => {
  const body = req.body.toString();
  const timestamp = req.headers['x-iro-timestamp'] as string;
  const signature = (req.headers['x-iro-signature'] as string) ?? '';

  const expected = crypto
    .createHmac('sha256', process.env.IRO_WEBHOOK_SECRET!)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const provided = signature.replace('sha256=', '');

  const valid =
    expected.length === provided.length &&
    crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(provided, 'hex')
    );

  // Reject stale requests (> 5 minutes)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return res.status(401).send('Stale');
  }

  if (!valid) return res.status(401).send('Invalid signature');

  const event = JSON.parse(body);
  console.log('[webhook]', event.event, event.data);

  res.status(200).end();
});</code></pre>

<h3>Python</h3>

<pre><code>import hmac, hashlib, time, os, json
from flask import Flask, request

app = Flask(__name__)

def verify(body: str, timestamp: str, signature: str) -> bool:
    if not timestamp or not signature:
        return False
    try:
        if abs(time.time() - int(timestamp)) > 300:
            return False
    except ValueError:
        return False

    expected = hmac.new(
        os.environ['IRO_WEBHOOK_SECRET'].encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, signature.replace('sha256=', ''))

@app.post('/webhooks/iro')
def iro_webhook():
    body = request.get_data(as_text=True)
    ts = request.headers.get('X-Iro-Timestamp', '')
    sig = request.headers.get('X-Iro-Signature', '')

    if not verify(body, ts, sig):
        return '', 401

    event = json.loads(body)
    print(f"[webhook] {event['event']}: {event['data']}")

    # Handle event...

    return '', 200</code></pre>

<h3>PHP</h3>

<pre><code>function verify_iro_webhook(string $body, string $timestamp, string $signature, string $secret): bool {
    if (abs(time() - (int)$timestamp) > 300) return false;

    $expected = hash_hmac(
        'sha256',
        "{$timestamp}.{$body}",
        $secret
    );

    return hash_equals($expected, str_replace('sha256=', '', $signature));
}

$body = file_get_contents('php://input');
$ts = $_SERVER['HTTP_X_IRO_TIMESTAMP'] ?? '';
$sig = $_SERVER['HTTP_X_IRO_SIGNATURE'] ?? '';

if (!verify_iro_webhook($body, $ts, $sig, getenv('IRO_WEBHOOK_SECRET'))) {
    http_response_code(401);
    exit;
}

$event = json_decode($body, true);
error_log("[webhook] {$event['event']}: " . json_encode($event['data']));</code></pre>

<h3>Go</h3>

<pre><code>import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "io"
    "net/http"
    "os"
    "strconv"
    "strings"
    "time"
)

func verifyIro(body string, timestamp string, signature string) bool {
    ts, err := strconv.ParseInt(timestamp, 10, 64)
    if err != nil || time.Now().Unix()-ts > 300 || ts-time.Now().Unix() > 300 {
        return false
    }

    mac := hmac.New(sha256.New, []byte(os.Getenv("IRO_WEBHOOK_SECRET")))
    mac.Write([]byte(timestamp + "." + body))
    expected := hex.EncodeToString(mac.Sum(nil))

    provided := strings.TrimPrefix(signature, "sha256=")
    return hmac.Equal([]byte(expected), []byte(provided))
}

http.HandleFunc("/webhooks/iro", func(w http.ResponseWriter, r *http.Request) {
    body, _ := io.ReadAll(r.Body)
    ts := r.Header.Get("X-Iro-Timestamp")
    sig := r.Header.Get("X-Iro-Signature")

    if !verifyIro(string(body), ts, sig) {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    // parse and handle
    w.WriteHeader(http.StatusOK)
})</code></pre>

<p><strong>Key details:</strong></p>
<ul>
  <li>Use <strong>constant-time comparison</strong> (<code>timingSafeEqual</code>, <code>hmac.compare_digest</code>, <code>hash_equals</code>, <code>hmac.Equal</code>)</li>
  <li>Reject requests older than <strong>5 minutes</strong></li>
  <li>Sign over the <strong>raw body</strong>, not a re-serialized JSON string</li>
</ul>

---

<h2 id="handling-events">Handling events</h2>

<h3>Route by event name</h3>

<pre><code>event = request.headers['X-Iro-Event']
data = json.loads(body)['data']

if event == 'user.authorized':
    # Welcome the user, log activity
    pass
elif event == 'user.revoked':
    # Kill that user's session
    Session.query.filter_by(user_id=data['user_id']).delete()
elif event == 'user.revoked_all':
    # Kill every session for this app
    Session.query.filter_by(provider='iro').delete()
elif event == 'ping':
    print('[webhook] ping test received')</code></pre>

<h3>Be idempotent</h3>

<p>Webhooks may be retried if your endpoint fails or times out. Use the <code>id</code> field to deduplicate:</p>

<pre><code>seen = db.query("SELECT 1 FROM processed_webhooks WHERE id = %s", [event['id']])
if seen:
    return '', 200  # already processed

# Process the event
db.execute("INSERT INTO processed_webhooks (id) VALUES (%s)", [event['id']])</code></pre>

<h3>Respond quickly</h3>

<p>Return <code>200</code> immediately. Do heavy work in the background.</p>

<pre><code>@app.post('/webhooks/iro')
def iro_webhook():
    if not verify(...):
        return '', 401

    event = json.loads(body)

    # Queue for async processing
    queue.enqueue(handle_event, event)

    return '', 200  # respond instantly</code></pre>

<p>If your endpoint takes longer than 10 seconds, the delivery is marked as failed and retried (if retries are enabled).</p>

<h3>Handle each event independently</h3>

<p>If one event handler throws, don't let it prevent the response. Catch exceptions and always return 200 to prevent duplicate deliveries:</p>

<pre><code>@app.post('/webhooks/iro')
def iro_webhook():
    if not verify(...):
        return '', 401

    event = json.loads(body)

    try:
        handle_event(event)
    except Exception as e:
        log.exception('webhook handler failed')

    return '', 200  # always 200 after signature verified</code></pre>

---

<h2 id="retry-and-failure-behavior">Retry and failure behavior</h2>

<p>Currently, each event triggers <strong>one delivery attempt</strong>. Failed deliveries are logged in the developer portal but not automatically retried.</p>

<table>
  <thead>
    <tr><th>Response</th><th>Delivered?</th><th>Logged as</th></tr>
  </thead>
  <tbody>
    <tr><td><code>2xx</code></td><td>✅ Yes</td><td>Success — <code>delivered_at</code> set</td></tr>
    <tr><td><code>4xx</code></td><td>❌ No</td><td>Failure — <code>error = "HTTP 4xx"</code></td></tr>
    <tr><td><code>5xx</code></td><td>❌ No</td><td>Failure — <code>error = "HTTP 5xx"</code></td></tr>
    <tr><td>Timeout (&gt;10s)</td><td>❌ No</td><td>Failure — <code>error = "aborted"</code></td></tr>
    <tr><td>Connection refused</td><td>❌ No</td><td>Failure — <code>error = "ECONNREFUSED"</code></td></tr>
    <tr><td>DNS failure</td><td>❌ No</td><td>Failure — <code>error = "ENOTFOUND"</code></td></tr>
  </tbody>
</table>

<p>View all delivery attempts in the developer portal — click <strong>Deliveries</strong> on a webhook row.</p>

<h3>Failure tracking</h3>

<p>Each webhook endpoint tracks:</p>
<ul>
  <li><code>last_success_at</code> — timestamp of the last successful delivery</li>
  <li><code>last_failure_at</code> — timestamp of the last failure</li>
  <li><code>last_error</code> — the most recent error message</li>
  <li><code>failure_count</code> — consecutive failures (resets on success)</li>
</ul>

<p>If a webhook consistently fails, investigate your endpoint. The provider doesn't auto-disable endpoints on failure — that's a deliberate choice so you don't miss events during a temporary outage.</p>

---

<h2 id="secret-rotation">Secret rotation</h2>

<p>If your signing secret is compromised or you need to rotate it:</p>

<ol>
  <li>Go to your app at <code>/developer/apps/&lt;id&gt;</code></li>
  <li>Scroll to <strong>Webhooks</strong></li>
  <li>Click <strong>Regenerate secret</strong> on the webhook row</li>
  <li>Confirm in the modal</li>
  <li><strong>Copy the new secret</strong> — it's shown once</li>
  <li>Update your receiver's environment variable</li>
  <li>Restart your server</li>
</ol>

<p><strong>The old secret stops working immediately.</strong> Any webhook deliveries during the window between rotation and your server restart will fail with <code>401</code>. Plan rotations during low-traffic periods.</p>

<h3>Zero-downtime rotation (recommended for production)</h3>

<ol>
  <li>Add support for two secrets in your receiver — check against both</li>
  <li>Rotate the secret in the developer portal</li>
  <li>Update your receiver with the new secret as the primary, old as fallback</li>
  <li>Wait 24 hours (all in-flight retries complete)</li>
  <li>Remove the old secret</li>
</ol>

---

<h2 id="testing">Testing</h2>

<h3>Developer portal Test button</h3>

<p>Click <strong>Test</strong> on any webhook row. The provider fires a <code>ping</code> event to your endpoint and displays the result:</p>

<ul>
  <li><strong>Green: "Test delivered — HTTP 200"</strong> → everything works</li>
  <li><strong>Red: "Test failed — HTTP 401"</strong> → signature mismatch, check your secret</li>
  <li><strong>Red: "Test failed — HTTP 5xx"</strong> → your receiver crashed, check logs</li>
  <li><strong>Red: "Test failed — no response recorded"</strong> → network issue, check the Deliveries log</li>
</ul>

<h3>Manual test from Termux / bash</h3>

<pre><code>URL="https://yourapp.com/webhooks/iro"
SECRET="iro_whsec_..."

BODY='{"id":"manual-1","event":"ping","created_at":"2026-01-01T00:00:00Z","data":{"message":"manual test"}}'
TS=$(date +%s)
SIG=$(printf "%s.%s" "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')

curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Iro-Event: ping" \
  -H "X-Iro-Timestamp: $TS" \
  -H "X-Iro-Signature: sha256=$SIG" \
  -d "$BODY"</code></pre>

<p>Expected: <code>HTTP/2 200</code> and your receiver logs the event.</p>

<h3>Simulate a revoked event</h3>

<ol>
  <li>Sign in to the app that owns the webhook</li>
  <li>Go to <code>/account</code> on the provider</li>
  <li>Find the app under <strong>Authorized Apps</strong></li>
  <li>Click <strong>Revoke</strong></li>
  <li>Watch your receiver's log — should print <code>user.revoked</code></li>
</ol>

<h3>Check delivery history</h3>

<ol>
  <li>Open the developer portal → your app → Webhooks</li>
  <li>Click <strong>Deliveries</strong> on a webhook row</li>
  <li>An alert shows the last 20 delivery attempts with event name, status, and error</li>
</ol>

---

<h2 id="code-examples">Code examples</h2>

<h3>Node.js / Express with background processing</h3>

<pre><code>import express from 'express';
import crypto from 'crypto';
import { Queue } from 'bullmq';

const app = express();
const queue = new Queue('iro-webhooks');

// Capture raw body for signature verification
app.use('/webhooks/iro', express.raw({ type: 'application/json' }));

app.post('/webhooks/iro', (req, res) => {
  const body = req.body.toString();
  const timestamp = req.headers['x-iro-timestamp'] as string;
  const signature = (req.headers['x-iro-signature'] as string) ?? '';

  const expected = crypto
    .createHmac('sha256', process.env.IRO_WEBHOOK_SECRET!)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const valid =
    expected.length === signature.replace('sha256=', '').length &&
    crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature.replace('sha256=', ''), 'hex')
    );

  if (!valid || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
    return res.status(401).end();
  }

  const event = JSON.parse(body);

  // Enqueue for background processing — respond immediately
  queue.add(event.event, event, {
    jobId: event.id, // dedupe by delivery ID
    removeOnComplete: 1000,
  });

  res.status(200).end();
});

// Worker
const worker = new Worker('iro-webhooks', async (job) => {
  const { event, data } = job.data;

  switch (event) {
    case 'user.authorized':
      await db.users.update({ iro_user_id: data.user_id }, { last_authorized: data.authorized_at });
      break;
    case 'user.revoked':
      await db.sessions.delete({ user_id: data.user_id });
      break;
    case 'user.revoked_all':
      await db.sessions.delete({ provider: 'iro' });
      break;
    case 'ping':
      console.log('[webhook] ping received');
      break;
  }
});</code></pre>

<h3>Python / Flask with Celery</h3>

<pre><code>import hmac, hashlib, time, os, json
from flask import Flask, request
from celery import Celery

app = Flask(__name__)
celery = Celery('webhooks', broker='redis://localhost:6379')

def verify(body, ts, sig):
    expected = hmac.new(
        os.environ['IRO_WEBHOOK_SECRET'].encode(),
        f"{ts}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, sig.replace('sha256=', ''))

@app.post('/webhooks/iro')
def iro_webhook():
    body = request.get_data(as_text=True)
    ts = request.headers.get('X-Iro-Timestamp', '')
    sig = request.headers.get('X-Iro-Signature', '')

    if abs(time.time() - int(ts)) > 300 or not verify(body, ts, sig):
        return '', 401

    event = json.loads(body)
    handle_event.delay(event)  # async task
    return '', 200

@celery.task
def handle_event(event):
    name = event['event']
    data = event['data']

    if name == 'user.revoked':
        Session.query.filter_by(user_id=data['user_id']).delete()
    elif name == 'user.revoked_all':
        Session.query.filter_by(provider='iro').delete()
    elif name == 'user.authorized':
        send_welcome_email(data['user_id'])</code></pre>

<h3>Cloudflare Workers</h3>

<pre><code>export default {
  async fetch(request, env) {
    const body = await request.text();
    const ts = request.headers.get('X-Iro-Timestamp');
    const sig = request.headers.get('X-Iro-Signature');

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.IRO_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${ts}.${body}`)
    );

    const expected = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (`sha256=${expected}` !== sig) {
      return new Response('unauthorized', { status: 401 });
    }

    const event = JSON.parse(body);
    console.log('Webhook received:', event.event);

    // Handle event...

    return new Response('ok');
  },
};</code></pre>

---

<h2 id="security-checklist">Security checklist</h2>

<ul>
  <li>✅ <strong>Verify the signature</strong> on every request — never trust a webhook without it</li>
  <li>✅ <strong>Use constant-time comparison</strong> for the HMAC check</li>
  <li>✅ <strong>Reject stale requests</strong> — check that <code>X-Iro-Timestamp</code> is within 5 minutes</li>
  <li>✅ <strong>Use HTTPS</strong> for your webhook URL</li>
  <li>✅ <strong>Store the secret in env vars</strong> — never in code or git</li>
  <li>✅ <strong>Be idempotent</strong> — use the <code>id</code> field to deduplicate</li>
  <li>✅ <strong>Respond quickly</strong> — return 200 within 10s</li>
  <li>✅ <strong>Handle errors gracefully</strong> — always return 200 after signature verification to prevent delivery loops</li>
  <li>✅ <strong>Log all deliveries</strong> for auditing</li>
  <li>✅ <strong>Rotate secrets</strong> if compromised or on schedule</li>
</ul>

<p><strong>Never do this:</strong></p>
<ul>
  <li>❌ Skip signature verification (even on "internal" endpoints)</li>
  <li>❌ Trust the payload without checking</li>
  <li>❌ Commit the secret to git</li>
  <li>❌ Respond with 500 on a processing error (it looks like a delivery failure)</li>
  <li>❌ Assume deliveries arrive in order (they don't necessarily)</li>
</ul>

---

<h2 id="troubleshooting">Troubleshooting</h2>

<table>
  <thead>
    <tr><th>Symptom</th><th>Cause</th><th>Fix</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>Test shows "no response recorded"</td>
      <td>Network can't reach your endpoint, or it times out (&gt;10s)</td>
      <td>Check Deliveries log for the actual error; ensure the URL is public HTTPS</td>
    </tr>
    <tr>
      <td>Test shows "HTTP 401"</td>
      <td>Signature verification failed</td>
      <td>Copy the secret again from the developer portal, update env, restart receiver</td>
    </tr>
    <tr>
      <td>Test shows "HTTP 404"</td>
      <td>Wrong URL path</td>
      <td>Check the route is <code>/webhooks/iro</code> (or whatever you registered)</td>
    </tr>
    <tr>
      <td>Test shows "HTTP 500"</td>
      <td>Your handler crashed</td>
      <td>Check receiver logs for the traceback</td>
    </tr>
    <tr>
      <td>Events don't arrive on real actions</td>
      <td>Event not subscribed, or emitter bug</td>
      <td>Check the webhook's <code>events</code> array includes the event; check provider's function logs</td>
    </tr>
    <tr>
      <td>Receiving duplicates</td>
      <td>Retries or network duplication</td>
      <td>Use the <code>id</code> field for deduplication in a DB or Redis set</td>
    </tr>
    <tr>
      <td>Signature always fails</td>
      <td>Body was parsed/re-serialized before signing check</td>
      <td>Capture the raw body — use <code>express.raw()</code> in Node, <code>request.get_data()</code> in Flask</td>
    </tr>
    <tr>
      <td>Signature fails after JSON parse</td>
      <td>Whitespace or key order changed</td>
      <td>Sign the exact bytes received, not a re-serialized object</td>
    </tr>
    <tr>
      <td>Webhook shows red "Last error"</td>
      <td>Endpoint returned 4xx/5xx or timed out</td>
      <td>Fix the receiver, click Test to verify, the error clears on the next success</td>
    </tr>
    <tr>
      <td>"Could not deliver" on every event</td>
      <td>Cloudflare blocked Netlify's egress IPs</td>
      <td>Add a WAF rule to skip <code>/webhooks/*</code> for IPv4 requests</td>
    </tr>
  </tbody>
</table>

---

<h2 id="faq">FAQ</h2>

<h3>How many times will a webhook be retried?</h3>

<p>Currently once per event. Retries with backoff are on the roadmap. Failed deliveries are logged but not automatically resent.</p>

<h3>Do events arrive in order?</h3>

<p>No. Events are delivered as they're emitted, but network conditions can reorder them. If order matters, sort by <code>created_at</code> after receiving.</p>

<h3>Can I subscribe to one event only?</h3>

<p>Yes. In the developer portal, when creating a webhook, tick only the events you want. The <code>ping</code> event is auto-subscribed so the Test button always works.</p>

<h3>Can one app have multiple webhook endpoints?</h3>

<p>Yes. Add as many as you need from the developer portal. Every active endpoint receives every subscribed event independently.</p>

<h3>What happens if my server is down?</h3>

<p>Deliveries fail and are logged. There's no automatic retry currently — check the Deliveries log when your server comes back online to see what was missed.</p>

<h3>Can I test locally with localhost?</h3>

<p>Not directly — the provider sends requests from Netlify's servers to your URL, so <code>http://localhost:3000</code> won't work. Use <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/">Cloudflare Tunnel</a>, <a href="https://ngrok.com/">ngrok</a>, or <a href="https://tailscale.com/kb/1223/funnel">Tailscale Funnel</a> to expose a local server with a public HTTPS URL.</p>

<h3>How do I know if a webhook is currently healthy?</h3>

<p>Look at the webhook row in the developer portal:</p>
<ul>
  <li><strong>Last delivered:</strong> timestamp of the last successful delivery</li>
  <li><strong>Last error:</strong> message from the most recent failure</li>
  <li><strong>Active badge:</strong> green (active) or grey (paused)</li>
</ul>

<h3>Can I pause a webhook without deleting it?</h3>

<p>Yes — click <strong>Pause</strong> on the webhook row. Deliveries stop immediately, but the secret and history are preserved. Click <strong>Resume</strong> to re-enable.</p>

<h3>What's the maximum payload size?</h3>

<p>Payloads are small (a few hundred bytes to a few KB). The provider supports payloads up to 100 KB without issue.</p>

<h3>Is the delivery retried if my server returns 500?</h3>

<p>No, currently just logged. If your handler crashes, log the error and return 200 to prevent the provider from considering the delivery failed. Retries from the provider would just re-fire the event.</p>

<h3>How do I handle events when I have multiple instances of my app?</h3>

<p>Two options:</p>
<ol>
  <li>Use a shared queue (Redis, SQS) — all instances pull from it</li>
  <li>Use a shared deduplication table keyed on the <code>id</code> field — the first instance to insert wins, others skip</li>
</ol>

<h3>Can I see the raw request that was sent?</h3>

<p>Partially. The Deliveries log shows the response body your server returned, the HTTP status, and the error (if any). The full outbound request isn't stored, but every field is documented in the <a href="#payload-format">Payload format</a> section.</p>

---

<h2>Support</h2>

<ul>
  <li><strong>Developer portal:</strong> <a href="https://auth.irotechlab.xi.to/developer">/developer</a></li>
  <li><strong>Integration guide:</strong> see <code>INTEGRATION.md</code></li>
  <li><strong>Delivery log:</strong> click <strong>Deliveries</strong> on any webhook row</li>
</ul>

<h3>When reporting a webhook issue, include:</h3>
<ol>
  <li>Your <code>client_id</code> (not the secret)</li>
  <li>The webhook URL</li>
  <li>The exact delivery error (from the Deliveries dialog)</li>
  <li>The response body your server returned</li>
  <li>Whether the Test button works but real events don't (or vice versa)</li>
</ol>

---

<p align="center">
  <strong>That's everything you need to receive and trust IrotechLab webhooks.</strong><br/>
  Register an endpoint, verify signatures, handle events. Production-ready in under 15 minutes.
</p>

<p align="center">
  Built and maintained by <a href="https://github.com/IROTECHLAB">IROTECHLAB</a>
</p>
