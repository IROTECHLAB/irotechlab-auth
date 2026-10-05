# Integration Guide

Add **"Sign in with IrotechLab"** to your app. This guide is for **integrators**
using the live provider at `https://auth.irotechlab.xi.to`.

Not what you're looking for?
- Running your own instance? → [DEPLOYMENT.md](./DEPLOYMENT.md)
- Receiving webhooks? → [WEBHOOKS.md](./WEBHOOKS.md)

---

<h1 align="center">Integrate with IrotechLab Auth</h1>

<p align="center">
  <strong>Add "Sign in with IrotechLab" to your app in under 10 minutes.</strong><br/>
  OAuth 2.0 / OpenID Connect · Authorization Code + PKCE · Refresh tokens · Webhooks
</p>

<p align="center">
  <a href="https://auth.irotechlab.xi.to">Live Provider</a> ·
  <a href="https://auth.irotechlab.xi.to/widget">Login Widget</a> ·
  <a href="https://auth.irotechlab.xi.to/developer">Developer Portal</a> ·
  <a href="https://auth.irotechlab.xi.to/.well-known/openid-configuration">Discovery</a>
</p>

---

<h2>Table of contents</h2>

<ol>
  <li><a href="#what-youre-building">What you're building</a></li>
  <li><a href="#register-your-app">Register your app</a></li>
  <li><a href="#choosing-a-client-type">Choosing a client type</a></li>
  <li><a href="#the-authorization-code--pkce-flow">The Authorization Code + PKCE flow</a></li>
  <li><a href="#step-by-step">Step-by-step</a></li>
  <li><a href="#scopes">Scopes</a></li>
  <li><a href="#fetching-the-user-profile">Fetching the user profile</a></li>
  <li><a href="#verifying-the-id_token">Verifying the id_token</a></li>
  <li><a href="#refresh-tokens">Refresh tokens</a></li>
  <li><a href="#revoking-tokens">Revoking tokens</a></li>
  <li><a href="#logout">Logout</a></li>
  <li><a href="#webhooks">Webhooks</a></li>
  <li><a href="#the-login-button">The login button</a></li>
  <li><a href="#oidc-libraries">OIDC libraries</a></li>
  <li><a href="#code-examples">Code examples</a></li>
  <li><a href="#error-reference">Error reference</a></li>
  <li><a href="#security-checklist">Security checklist</a></li>
  <li><a href="#troubleshooting">Troubleshooting</a></li>
</ol>

---

<h2 id="what-youre-building">What you're building</h2>

You're letting users sign in to your app with their existing IrotechLab account, the same way "Sign in with Google" or "Sign in with GitHub" works.

Your app never sees the user's password. It gets a stable user ID (`sub`) and, with permission, an email and profile.

The flow:

<pre><code>┌──────────┐                ┌──────────────────┐              ┌──────────────┐
│  User    │                │  Your App        │              │ IrotechLab   │
│  Browser │                │  (server side)   │              │ Auth         │
└────┬─────┘                └────────┬─────────┘              └──────┬───────┘
     │                               │                               │
     │ 1. Click "Sign in"            │                               │
     │──────────────────────────────>│                               │
     │                               │ 2. Redirect to /authorize     │
     │<──────────────────────────────│                               │
     │                                                               │
     │ 3. User logs in + approves consent                            │
     │──────────────────────────────────────────────────────────────>│
     │                                                               │
     │ 4. Redirect back with ?code=...&state=...                     │
     │<──────────────────────────────────────────────────────────────│
     │                               │                               │
     │ 5. Send code to your server   │                               │
     │──────────────────────────────>│                               │
     │                               │ 6. Exchange code for tokens   │
     │                               │──────────────────────────────>│
     │                               │<── access + id + refresh ─────│
     │                               │                               │
     │                               │ 7. Fetch user profile         │
     │                               │──────────────────────────────>│
     │                               │<── {sub, email, name, ...} ───│
     │                               │                               │
     │ 8. Signed in                  │                               │
     │<──────────────────────────────│                               │</code></pre>

---

<h2 id="register-your-app">Register your app</h2>

<ol>
  <li>Sign in at <a href="https://auth.irotechlab.xi.to/login">auth.irotechlab.xi.to</a></li>
  <li>Verify your email (click the link in the email you receive)</li>
  <li>Open <a href="https://auth.irotechlab.xi.to/developer/new">/developer/new</a></li>
  <li>Fill in:
    <ul>
      <li><strong>Name</strong> — shown to users on the consent screen (e.g. "My Todo App")</li>
      <li><strong>Description</strong> — optional, also shown on consent</li>
      <li><strong>Homepage URL</strong> — optional</li>
      <li><strong>Logo</strong> — optional, PNG/JPG/WebP under 2 MB</li>
      <li><strong>Redirect URIs</strong> — see below</li>
      <li><strong>Scopes</strong> — check <code>openid</code>, <code>profile</code>, <code>email</code></li>
      <li><strong>Client type</strong> — Public or Confidential (see next section)</li>
    </ul>
  </li>
  <li>Submit → you'll get a <strong>client ID</strong> and, for confidential clients, a <strong>client secret</strong></li>
</ol>

<p><strong>Save the secret immediately.</strong> It's shown once. If you lose it, use <em>Regenerate Secret</strong> on the app page.</p>

<h3>Redirect URIs — pick carefully</h3>

<p>A redirect URI is where IrotechLab sends the user after they sign in. It's your app's callback endpoint.</p>

<table>
  <thead>
    <tr><th>Where your app runs</th><th>Register this URI</th></tr>
  </thead>
  <tbody>
    <tr><td>Local dev</td><td><code>http://localhost:3000/callback</code></td></tr>
    <tr><td>Vercel</td><td><code>https://yourapp.vercel.app/api/auth/callback</code></td></tr>
    <tr><td>Deployed at a platform subdomain</td><td><code>https://yourapp.platform.app/callback</code></td></tr>
    <tr><td>Your own domain</td><td><code>https://app.yourdomain.com/auth/callback</code></td></tr>
    <tr><td>Mobile deep link</td><td><code>myapp://oauth/callback</code></td></tr>
    <tr><td>Static HTML site</td><td><code>https://yoursite.com/callback.html</code></td></tr>
  </tbody>
</table>

<p><strong>Rules:</strong></p>
<ul>
  <li>Must be absolute (<code>https://...</code> or <code>http://localhost</code>)</li>
  <li>Must use HTTPS in production — only <code>http://localhost</code> is exempt</li>
  <li>Must match <strong>exactly</strong> at runtime — same scheme, host, port, path, no trailing slash</li>
  <li>No wildcards. Register every variant you need.</li>
  <li>Up to 10 URIs per app</li>
</ul>

---

<h2 id="choosing-a-client-type">Choosing a client type</h2>

<table>
  <thead>
    <tr><th></th><th>Public</th><th>Confidential</th></tr>
  </thead>
  <tbody>
    <tr><td>Best for</td><td>SPAs, mobile apps, CLIs, static sites</td><td>Server-rendered apps, backends with a database</td></tr>
    <tr><td>Has a secret</td><td>No</td><td>Yes</td></tr>
    <tr><td>Auth method</td><td>PKCE only</td><td>PKCE + client_secret</td></tr>
    <tr><td>Token exchange from</td><td>Browser (careful)</td><td>Server only</td></tr>
  </tbody>
</table>

<p><strong>Rule of thumb:</strong> if you can keep a secret on the server, use Confidential. If your app runs entirely in the browser, use Public.</p>

<p><strong>Never</strong> put a client secret in browser JavaScript, a mobile app bundle, or anywhere a user could extract it. If you can't keep it secret, use a Public client.</p>

---

<h2 id="the-authorization-code--pkce-flow">The Authorization Code + PKCE flow</h2>

<p>PKCE (Proof Key for Code Exchange, "pixy") protects the authorization flow. It works like this:</p>

<ol>
  <li>Before redirecting, you generate a random string called the <strong>verifier</strong></li>
  <li>You hash it with SHA-256 to get a <strong>challenge</strong></li>
  <li>You send the <em>challenge</em> to <code>/authorize</code></li>
  <li>When exchanging the code, you send the original <em>verifier</em></li>
  <li>The server checks <code>SHA256(verifier) === challenge</code></li>
</ol>

<p>This binds the code to your specific client session — even if someone intercepts the authorization code, they can't exchange it without the verifier.</p>

<p><strong>Every client must use PKCE</strong>, public or confidential. It's mandatory.</p>

---

<h2 id="step-by-step">Step-by-step</h2>

<h3>1. Generate PKCE parameters</h3>

<pre><code>verifier  = base64url(random 32 bytes)       → 43 characters
challenge = base64url(SHA256(verifier))      → 43 characters
state     = base64url(random 16 bytes)       → 22 characters</code></pre>

<p>Save <code>verifier</code> and <code>state</code> — you'll need them after the callback. <strong>Never send the verifier to /authorize.</strong></p>

<h3>2. Redirect the user to /authorize</h3>

<pre><code>GET https://auth.irotechlab.xi.to/api/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https%3A%2F%2Fyourapp.com%2Fcallback
  &response_type=code
  &scope=openid%20profile%20email
  &state=RANDOM_STATE
  &code_challenge=PKCE_CHALLENGE
  &code_challenge_method=S256</code></pre>

<p>What happens next:</p>
<ul>
  <li>If the user isn't signed in → redirected to login, then back here</li>
  <li>First time → consent screen listing your scopes</li>
  <li>After approval → browser redirected to your callback with <code>?code=...&state=...</code></li>
</ul>

<h3>3. Handle the callback</h3>

<pre><code>https://yourapp.com/callback?code=AUTH_CODE&state=RANDOM_STATE</code></pre>

<ol>
  <li><strong>Verify <code>state</code> matches</strong> the value you sent. Reject if not.</li>
  <li><strong>Exchange the code immediately.</strong> Codes are single-use and expire in 5 minutes.</li>
</ol>

<h3>4. Exchange the code for tokens</h3>

<pre><code>POST https://auth.irotechlab.xi.to/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=https://yourapp.com/callback
&client_id=YOUR_CLIENT_ID
&code_verifier=PKCE_VERIFIER
&client_secret=YOUR_SECRET</code></pre>

<p><strong>Omit <code>client_secret</code></strong> if you registered a Public client.</p>

<p>Response:</p>

<pre><code>{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "AbCdEf...",
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "scope": "openid profile email"
}</code></pre>

<table>
  <thead>
    <tr><th>Field</th><th>Use it for</th></tr>
  </thead>
  <tbody>
    <tr><td><code>access_token</code></td><td>Calling <code>/userinfo</code>. Expires in 1 hour.</td></tr>
    <tr><td><code>id_token</code></td><td>Extracting user claims. Verify signature before trusting.</td></tr>
    <tr><td><code>refresh_token</code></td><td>Getting new access tokens. Rotates on every use. Valid 30 days.</td></tr>
  </tbody>
</table>

<h3>5. Fetch the user profile</h3>

<pre><code>GET https://auth.irotechlab.xi.to/api/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN</code></pre>

<p>Response:</p>

<pre><code>{
  "sub": "b0e0c3c5-...",
  "email": "user@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "given_name": "Jane",
  "family_name": "Doe",
  "picture": "data:image/png;base64,iVBORw0..."
}</code></pre>

<p><strong><code>sub</code> is your stable user ID.</strong> Use it as the foreign key in your database. It never changes.</p>

<p><code>picture</code> is a base64 data URI — drop it directly into <code>&lt;img src="..."&gt;</code>.</p>

<h3>6. Create a local session</h3>

<p>Look up your user by <code>sub</code> (or create them on first login). Set your own session cookie. The user is now signed in.</p>

---

<h2 id="scopes">Scopes</h2>

<table>
  <thead>
    <tr><th>Scope</th><th>Returns</th></tr>
  </thead>
  <tbody>
    <tr><td><code>openid</code></td><td><code>sub</code> — the user's stable ID. Required for OIDC.</td></tr>
    <tr><td><code>profile</code></td><td><code>name</code>, <code>given_name</code>, <code>family_name</code>, <code>picture</code></td></tr>
    <tr><td><code>email</code></td><td><code>email</code>, <code>email_verified</code></td></tr>
  </tbody>
</table>

<p>Request only what you need. The consent screen lists every scope.</p>

---

<h2 id="fetching-the-user-profile">Fetching the user profile</h2>

<pre><code>GET https://auth.irotechlab.xi.to/api/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN</code></pre>

<table>
  <thead>
    <tr><th>Field</th><th>Type</th><th>Notes</th></tr>
  </thead>
  <tbody>
    <tr><td><code>sub</code></td><td>string (UUID)</td><td>Stable user ID</td></tr>
    <tr><td><code>email</code></td><td>string</td><td>User's email</td></tr>
    <tr><td><code>email_verified</code></td><td>boolean</td><td>Whether the user verified their email</td></tr>
    <tr><td><code>name</code></td><td>string</td><td>Full display name</td></tr>
    <tr><td><code>given_name</code></td><td>string</td><td>First name</td></tr>
    <tr><td><code>family_name</code></td><td>string</td><td>Last name</td></tr>
    <tr><td><code>picture</code></td><td>string</td><td>Base64 data URI, might be missing</td></tr>
  </tbody>
</table>

<p>Which fields come back depends on which scopes you requested.</p>

---

<h2 id="verifying-the-id_token">Verifying the id_token</h2>

<p>The <code>id_token</code> is a JWT signed with RS256. <strong>Always verify the signature before trusting any claim.</strong></p>

<p><strong>Node.js (jose):</strong></p>

<pre><code>import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('https://auth.irotechlab.xi.to/.well-known/jwks.json')
);

const { payload } = await jwtVerify(idToken, JWKS, {
  issuer: 'https://auth.irotechlab.xi.to',
  audience: 'YOUR_CLIENT_ID',
});

// payload.sub, payload.email, payload.name, etc.</code></pre>

<p><strong>Python (PyJWT):</strong></p>

<pre><code>import jwt
from jwt import PyJWKClient

jwks = PyJWKClient("https://auth.irotechlab.xi.to/.well-known/jwks.json")
signing_key = jwks.get_signing_key_from_jwt(id_token)

claims = jwt.decode(
    id_token,
    signing_key.key,
    algorithms=["RS256"],
    audience="YOUR_CLIENT_ID",
    issuer="https://auth.irotechlab.xi.to",
)</code></pre>

<p><strong>Reject any token where:</strong></p>
<ul>
  <li>The signature doesn't verify against a JWKS key</li>
  <li><code>iss</code> ≠ <code>https://auth.irotechlab.xi.to</code></li>
  <li><code>aud</code> ≠ your <code>client_id</code></li>
  <li><code>exp</code> is in the past</li>
</ul>

---

<h2 id="refresh-tokens">Refresh tokens</h2>

<p>Access tokens expire in 1 hour. Use the refresh token to get a new one without asking the user to sign in again.</p>

<pre><code>POST https://auth.irotechlab.xi.to/api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token=OLD_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_SECRET</code></pre>

<p>Response: same shape as the code exchange, with a <strong>new</strong> <code>refresh_token</code>.</p>

<h3>Important — rotation + reuse detection</h3>

<p>Every refresh token is <strong>single-use</strong>. When you exchange one, the old token is immediately invalidated and replaced by a new one.</p>

<p>If you ever try to reuse an already-rotated refresh token, the server treats it as a compromise and <strong>revokes the entire token family</strong> — the user must sign in again.</p>

<p><strong>Always save the new <code>refresh_token</code></strong> from every refresh response. Never cache the old one.</p>

<p>Refresh tokens last 30 days.</p>

---

<h2 id="revoking-tokens">Revoking tokens</h2>

<p>When your user signs out or removes your app:</p>

<pre><code>POST https://auth.irotechlab.xi.to/api/oauth/revoke
Content-Type: application/x-www-form-urlencoded

token=REFRESH_TOKEN
&client_id=YOUR_CLIENT_ID
&client_secret=YOUR_SECRET</code></pre>

<p>Always returns 200, even if the token was already invalid.</p>

<p>Revoking a refresh token invalidates all descendants in its rotation chain.</p>

---

<h2 id="logout">Logout</h2>

<p>To log the user out of both your app <em>and</em> the provider:</p>

<ol>
  <li>Clear your own session cookie</li>
  <li>Revoke your refresh token (above)</li>
  <li>Optionally redirect to the provider's logout:
    <pre><code>https://auth.irotechlab.xi.to/api/oauth/logout
  ?post_logout_redirect_uri=https%3A%2F%2Fyourapp.com%2F
  &state=OPTIONAL_STATE</code></pre>
  </li>
</ol>

<p>The provider destroys its session and redirects back to your app.</p>

---

<h2 id="webhooks">Webhooks</h2>

<p>Get real-time notifications when users authorize or revoke your app.</p>

<h3>Subscribe</h3>

<ol>
  <li>Open your app at <code>/developer/apps/&lt;id&gt;</code></li>
  <li>Scroll to <strong>Webhooks</strong> → click <strong>Add webhook</strong></li>
  <li>Enter your endpoint URL (must be HTTPS)</li>
  <li>Choose events:
    <ul>
      <li><code>user.authorized</code> — a user authorized your app</li>
      <li><code>user.revoked</code> — a user revoked access</li>
      <li><code>user.revoked_all</code> — the app owner revoked all users</li>
      <li><code>refresh_token.rotated</code></li>
      <li><code>client.updated</code> / <code>disabled</code> / <code>deleted</code></li>
      <li><code>email.verified</code></li>
    </ul>
  </li>
  <li>Copy the signing secret (shown once)</li>
</ol>

<h3>Delivery format</h3>

<pre><code>POST https://yourapp.com/webhooks/iro
Content-Type: application/json
User-Agent: IrotechLab-Webhooks/1.0
X-Iro-Event: user.revoked_all
X-Iro-Delivery: a1b2c3d4e5f6a7b8
X-Iro-Timestamp: 1790840000
X-Iro-Signature: sha256=abc123...

{
  "id": "a1b2c3d4e5f6a7b8",
  "event": "user.revoked_all",
  "created_at": "2026-10-01T00:00:00Z",
  "data": {
    "revoked_count": 5,
    "revoked_at": "2026-10-01T00:00:00Z"
  }
}</code></pre>

<h3>Verify the signature</h3>

<p>The signature is <code>HMAC-SHA256(secret, timestamp + "." + body)</code>.</p>

<p><strong>Python:</strong></p>

<pre><code>import hmac, hashlib, time

def verify_iro_webhook(body, timestamp, signature, secret):
    if abs(time.time() - int(timestamp)) > 300:
        return False
    expected = hmac.new(
        secret.encode(),
        f"{timestamp}.{body}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature.replace("sha256=", ""))</code></pre>

<p><strong>Node.js:</strong></p>

<pre><code>import crypto from 'crypto';

function verifyIroWebhook(body, timestamp, signature, secret) {
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature.replace('sha256=', ''), 'hex')
  );
}</code></pre>

<p>Reject any request where the timestamp is more than 5 minutes old — this prevents replay attacks.</p>

<h3>Best practices</h3>

<ul>
  <li><strong>Respond 200 quickly</strong> — return within 10 seconds or the delivery is marked failed</li>
  <li><strong>Process asynchronously</strong> — return 200 immediately, do work in the background</li>
  <li><strong>Be idempotent</strong> — use the <code>id</code> field to deduplicate</li>
  <li><strong>Verify the signature</strong> — always, or attackers can forge events</li>
  <li><strong>Use the Test button</strong> in the developer portal to send a <code>ping</code> event</li>
</ul>

---

<h2 id="the-login-button">The login button</h2>

<p>Drop this anywhere on your site to add a branded "Continue with IrotechLab" button.</p>

<h3>HTML</h3>

<pre><code>&lt;a href="https://auth.irotechlab.xi.to/api/oauth/widget?client_id=YOUR_CLIENT_ID"
   class="iro-widget iro-widget-brand iro-widget-md iro-widget-rounded"&gt;
  &lt;span class="iro-widget-mark" style="width:22px;height:22px"&gt;
    &lt;svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none"&gt;
      &lt;g fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"&gt;
        &lt;circle cx="50" cy="18" r="8" fill="currentColor" stroke="none"/&gt;
        &lt;path d="M 25 30 L 75 30 L 75 55 Q 75 75 50 88 Q 25 75 25 55 Z"/&gt;
        &lt;circle cx="50" cy="52" r="5" fill="currentColor" stroke="none"/&gt;
        &lt;rect x="47.4" y="55" width="5" height="11" rx="2.5" fill="currentColor" stroke="none"/&gt;
      &lt;/g&gt;
    &lt;/svg&gt;
  &lt;/span&gt;
  &lt;span&gt;Continue with IrotechLab&lt;/span&gt;
&lt;/a&gt;</code></pre>

<h3>CSS</h3>

<pre><code>.iro-widget {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.28);
}
.iro-widget:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.38);
}
.iro-widget-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Light variant */
.iro-widget-light {
  color: #4f46e5;
  background: #fff;
  border: 1px solid #e5e7eb;
}
.iro-widget-light:hover { background: #f9fafb; }

/* Dark variant */
.iro-widget-dark { background: #111827; }</code></pre>

<p>The button redirects to your registered <code>redirect_uri</code> with <code>?code=...&state=...</code>.</p>

<p>See all variants and copy-paste snippets at <a href="https://auth.irotechlab.xi.to/widget">/widget</a>.</p>

---

<h2 id="oidc-libraries">OIDC libraries</h2>

<p>Because discovery is spec-compliant, you can point any certified OIDC library at the issuer. The library handles PKCE, state, token exchange, and ID token verification.</p>

<p><strong>Node.js (openid-client):</strong></p>

<pre><code>import { Issuer } from 'openid-client';

const issuer = await Issuer.discover('https://auth.irotechlab.xi.to');
const client = new issuer.Client({
  client_id: 'iro_...',
  client_secret: 'iro_sk_live_...', // omit for public
  redirect_uris: ['https://yourapp.com/callback'],
  response_types: ['code'],
});</code></pre>

<p><strong>Python (authlib):</strong></p>

<pre><code>from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)
oauth.register(
    name='irotechlab',
    server_metadata_url='https://auth.irotechlab.xi.to/.well-known/openid-configuration',
    client_id='iro_...',
    client_secret='iro_sk_live_...',
    client_kwargs={'scope': 'openid profile email'},
)</code></pre>

<p><strong>Node.js (Passport):</strong></p>

<pre><code>import { Strategy as OIDCStrategy } from 'passport-openidconnect';

passport.use(new OIDCStrategy({
  issuer: 'https://auth.irotechlab.xi.to',
  authorizationURL: 'https://auth.irotechlab.xi.to/api/oauth/authorize',
  tokenURL: 'https://auth.irotechlab.xi.to/api/oauth/token',
  userInfoURL: 'https://auth.irotechlab.xi.to/api/oauth/userinfo',
  clientID: process.env.IRO_CLIENT_ID,
  clientSecret: process.env.IRO_CLIENT_SECRET,
  callbackURL: 'https://yourapp.com/callback',
}, (issuer, profile, done) => done(null, profile)));</code></pre>

---

<h2 id="code-examples">Code examples</h2>

<h3>Node.js / Express</h3>

<pre><code>import express from 'express';
import crypto from 'crypto';
import cookieSession from 'cookie-session';

const app = express();
app.use(cookieSession({ name: 'app', keys: [process.env.SESSION_SECRET] }));

const ISSUER = 'https://auth.irotechlab.xi.to';
const CLIENT_ID = process.env.IRO_CLIENT_ID;
const CLIENT_SECRET = process.env.IRO_CLIENT_SECRET;
const REDIRECT_URI = 'https://yourapp.com/callback';

const b64url = (b) => b.toString('base64url');

app.get('/login', (req, res) => {
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(16));

  req.session.pkce = { verifier, state };

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  res.redirect(`${ISSUER}/api/oauth/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  const { verifier, state: expected } = req.session.pkce ?? {};
  if (!code || state !== expected) return res.status(400).send('State mismatch');

  const tokRes = await fetch(`${ISSUER}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: verifier,
    }),
  });
  const tokens = await tokRes.json();

  const uiRes = await fetch(`${ISSUER}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await uiRes.json();

  req.session.user = user;
  req.session.tokens = tokens;
  delete req.session.pkce;

  res.redirect('/dashboard');
});</code></pre>

<h3>Python / Flask</h3>

<pre><code>import os, secrets, hashlib, base64
from urllib.parse import urlencode
import httpx
from flask import Flask, request, session, redirect

app = Flask(__name__)
app.secret_key = os.environ['SESSION_SECRET']

ISSUER = 'https://auth.irotechlab.xi.to'
CLIENT_ID = os.environ['IRO_CLIENT_ID']
CLIENT_SECRET = os.environ['IRO_CLIENT_SECRET']
REDIRECT_URI = 'https://yourapp.com/callback'

def b64url(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()

@app.route('/login')
def login():
    verifier = b64url(secrets.token_bytes(32))
    challenge = b64url(hashlib.sha256(verifier.encode()).digest())
    state = b64url(secrets.token_bytes(16))

    session['pkce'] = {'verifier': verifier, 'state': state}

    params = {
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'response_type': 'code',
        'scope': 'openid profile email',
        'state': state,
        'code_challenge': challenge,
        'code_challenge_method': 'S256',
    }
    return redirect(f'{ISSUER}/api/oauth/authorize?{urlencode(params)}')

@app.route('/callback')
def callback():
    code = request.args.get('code')
    state = request.args.get('state')
    pkce = session.get('pkce', {})
    if not code or state != pkce.get('state'):
        return 'State mismatch', 400

    with httpx.Client() as c:
        tok = c.post(f'{ISSUER}/api/oauth/token', data={
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': REDIRECT_URI,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'code_verifier': pkce['verifier'],
        }).json()

        user = c.get(
            f'{ISSUER}/api/oauth/userinfo',
            headers={'Authorization': f"Bearer {tok['access_token']}"},
        ).json()

    session['user'] = user
    session.pop('pkce', None)
    return redirect('/dashboard')</code></pre>

<h3>Static HTML (Public client, no backend)</h3>

<p>Two files: <code>index.html</code> and <code>callback.html</code>.</p>

<p><strong>auth.js:</strong></p>

<pre><code>const ISSUER = 'https://auth.irotechlab.xi.to';
const CLIENT_ID = 'iro_YOUR_PUBLIC_CLIENT_ID';
const REDIRECT_URI = location.origin + '/callback.html';

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function login() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(await crypto.subtle.digest(
    'SHA-256', new TextEncoder().encode(verifier)
  ));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));

  sessionStorage.setItem('v', verifier);
  sessionStorage.setItem('s', state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  location.href = `${ISSUER}/api/oauth/authorize?${params}`;
}

async function handleCallback() {
  const p = new URLSearchParams(location.search);
  const code = p.get('code');
  const state = p.get('state');
  if (state !== sessionStorage.getItem('s')) throw new Error('state mismatch');

  const tokens = await fetch(`${ISSUER}/api/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: sessionStorage.getItem('v'),
    }),
  }).then(r => r.json());

  const user = await fetch(`${ISSUER}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then(r => r.json());

  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('tokens', JSON.stringify(tokens));
  location.href = '/';
}</code></pre>

<p>Register <code>https://yoursite.com/callback.html</code> as a redirect URI.</p>

---

<h2 id="error-reference">Error reference</h2>

<p>All errors follow the OAuth 2.0 spec:</p>

<pre><code>{
  "error": "invalid_grant",
  "error_description": "Code invalid or expired"
}</code></pre>

<h3>/authorize</h3>

<table>
  <thead><tr><th>Error</th><th>Cause</th></tr></thead>
  <tbody>
    <tr><td><code>invalid_request</code></td><td>Missing or malformed parameter</td></tr>
    <tr><td><code>invalid_client</code></td><td>Unknown or disabled client_id</td></tr>
    <tr><td><code>invalid_redirect_uri</code></td><td>redirect_uri not in registered list</td></tr>
    <tr><td><code>pkce_required</code></td><td>Public client missing code_challenge</td></tr>
  </tbody>
</table>

<h3>/token</h3>

<table>
  <thead><tr><th>Error</th><th>Cause</th></tr></thead>
  <tbody>
    <tr><td><code>invalid_request</code></td><td>Missing form field</td></tr>
    <tr><td><code>invalid_client</code></td><td>Wrong client_id/secret, or secret sent for public client</td></tr>
    <tr><td><code>invalid_grant</code></td><td>Code/refresh invalid, expired, used, PKCE mismatch, redirect_uri mismatch</td></tr>
    <tr><td><code>unsupported_grant_type</code></td><td>Only <code>authorization_code</code> and <code>refresh_token</code> accepted</td></tr>
    <tr><td><code>rate_limited</code></td><td>HTTP 429 — back off and retry</td></tr>
  </tbody>
</table>

<h3>/userinfo</h3>

<table>
  <thead><tr><th>Error</th><th>Cause</th></tr></thead>
  <tbody>
    <tr><td><code>invalid_token</code></td><td>Missing, malformed, expired, or revoked bearer token</td></tr>
  </tbody>
</table>

---

<h2 id="security-checklist">Security checklist</h2>

<ul>
  <li>✅ <strong>Use PKCE</strong> on every client, even confidential ones</li>
  <li>✅ <strong>Validate <code>state</code></strong> on every callback</li>
  <li>✅ <strong>Never embed <code>client_secret</code> in browsers or mobile apps</strong> — use a Public client</li>
  <li>✅ <strong>Verify the <code>id_token</code> signature</strong> before trusting claims</li>
  <li>✅ <strong>Check <code>iss</code> and <code>aud</code></strong> on every token</li>
  <li>✅ <strong>Register redirect URIs exactly</strong> — no trailing slash, no wildcard</li>
  <li>✅ <strong>Handle refresh <code>invalid_grant</code> as a breach</strong> — force re-login</li>
  <li>✅ <strong>Revoke on logout</strong> — call <code>/revoke</code> with the refresh token</li>
  <li>✅ <strong>Verify webhook signatures</strong> — reject anything with a bad <code>X-Iro-Signature</code></li>
  <li>✅ <strong>Reject stale webhooks</strong> — check <code>X-Iro-Timestamp</code> within 5 minutes</li>
  <li>✅ <strong>Store tokens in HttpOnly cookies</strong> for server apps, in-memory for SPAs. Never <code>localStorage</code> for tokens.</li>
</ul>

<p><strong>Never do this:</strong></p>
<ul>
  <li>❌ Trust the <code>id_token</code> without verifying its signature</li>
  <li>❌ Accept a webhook without checking its signature</li>
  <li>❌ Put the client secret in client-side code</li>
  <li>❌ Hardcode tokens or secrets in committed source</li>
</ul>

---

<h2 id="troubleshooting">Troubleshooting</h2>

<table>
  <thead>
    <tr><th>Symptom</th><th>Likely cause</th><th>Fix</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><code>invalid_redirect_uri</code></td>
      <td>URI not registered, or tiny difference (slash, port, scheme)</td>
      <td>Add the exact string at <code>/developer/apps/&lt;id&gt;</code></td>
    </tr>
    <tr>
      <td><code>invalid_client</code></td>
      <td>Wrong secret, or public client sent one</td>
      <td>Omit <code>client_secret</code> for public clients; re-copy for confidential</td>
    </tr>
    <tr>
      <td>PKCE verification failed</td>
      <td>Verifier doesn't match the challenge</td>
      <td>Regenerate both together; keep the pair</td>
    </tr>
    <tr>
      <td>Lost client secret</td>
      <td>Shown only once</td>
      <td>Click <strong>Regenerate Secret</strong> on the app page</td>
    </tr>
    <tr>
      <td>State mismatch</td>
      <td>Cookie lost between redirects</td>
      <td>Store state in a session cookie, not localStorage (for SSR apps)</td>
    </tr>
    <tr>
      <td>Redirect loop on login</td>
      <td>Callback redirects back to <code>/login</code></td>
      <td>Check your callback sets the session <em>before</em> redirecting</td>
    </tr>
    <tr>
      <td>Refresh fails repeatedly</td>
      <td>Reusing an old refresh token</td>
      <td>Always save the new <code>refresh_token</code> from the last response</td>
    </tr>
    <tr>
      <td><code>invalid_token</code> on /userinfo</td>
      <td>Sending <code>id_token</code> instead of <code>access_token</code></td>
      <td>Use <code>access_token</code> as the Bearer token</td>
    </tr>
    <tr>
      <td>Webhook signature fails</td>
      <td>Secret mismatch</td>
      <td>Copy the fresh secret from the provider, update env, restart receiver</td>
    </tr>
    <tr>
      <td>Webhook times out</td>
      <td>Your receiver takes &gt;10s to respond</td>
      <td>Return 200 immediately, process async</td>
    </tr>
    <tr>
      <td>User gets 401 on preview URL</td>
      <td>Testing on a deploy-preview URL — cookies are isolated per subdomain</td>
      <td>Use <code>https://auth.irotechlab.xi.to</code> only (never a preview URL)</td>
    </tr>
  </tbody>
</table>

---

<h2>Getting help</h2>

<ul>
  <li><strong>Discovery document:</strong> <a href="https://auth.irotechlab.xi.to/.well-known/openid-configuration">/.well-known/openid-configuration</a></li>
  <li><strong>JWKS:</strong> <a href="https://auth.irotechlab.xi.to/.well-known/jwks.json">/.well-known/jwks.json</a></li>
  <li><strong>Developer portal:</strong> <a href="https://auth.irotechlab.xi.to/developer">/developer</a></li>
  <li><strong>Widget showcase:</strong> <a href="https://auth.irotechlab.xi.to/widget">/widget</a></li>
</ul>

<h3>Diagnostic endpoints</h3>

<ul>
  <li><code>GET /api/dev/smtp-check</code> — verify SMTP is working</li>
  <li><code>GET /api/dev/ratelimit-check</code> — provider-side rate-limiting health check</li>
</ul>

<h3>When reporting an issue, include</h3>

<ol>
  <li>Your <code>client_id</code> (not the secret)</li>
  <li>The exact URL that failed</li>
  <li>The full response body from the error</li>
  <li>The value of <code>state</code> if the error mentions state mismatch</li>
  <li>Whether you used a Public or Confidential client</li>
</ol>

---

<h2>Standards implemented</h2>

<ul>
  <li><strong>RFC 6749</strong> — OAuth 2.0 Authorization Framework</li>
  <li><strong>RFC 7636</strong> — Proof Key for Code Exchange (PKCE)</li>
  <li><strong>RFC 7009</strong> — OAuth 2.0 Token Revocation</li>
  <li><strong>RFC 7662</strong> — OAuth 2.0 Token Introspection</li>
  <li><strong>OpenID Connect Core 1.0</strong></li>
  <li><strong>OpenID Connect Discovery 1.0</strong></li>
  <li><strong>OpenID Connect Session Management 1.0</strong></li>
</ul>

<p>Any certified OIDC client library will work against this provider without modification.</p>

---

<p align="center">
  <strong>That's everything.</strong><br/>
  Register an app, generate PKCE, handle the callback, save the user. Done in 10 minutes.
</p>

<p align="center">
  Built and maintained by <a href="https://github.com/IROTECHLAB">IROTECHLAB</a>
</p>