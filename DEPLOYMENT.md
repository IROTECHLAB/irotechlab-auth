# Deployment Guide

Deploy your own instance of IrotechLab Auth on free-tier infrastructure.

This guide is for **operators** running their own copy. If you just want to add
"Sign in with IrotechLab" to your app using the hosted provider, see
[INTEGRATION.md](./INTEGRATION.md).

---

## Prerequisites

Free accounts on:

- [Netlify](https://app.netlify.com) — hosting
- [Neon](https://neon.tech) — Postgres database
- [Upstash](https://console.upstash.com) — Redis (rate limiting)
- [Maileroo](https://maileroo.com) — SMTP (email verification + password reset)
- [GitHub](https://github.com) — source + deploy

irocap is open source but **not publicly hosted**. You must deploy your own
instance before enabling captcha. See [github.com/IROTECHLAB/irocap](https://github.com/IROTECHLAB/irocap).

---

## 1. Clone the repo

    git clone https://github.com/IROTECHLAB/irotechlab-auth.git
    cd irotechlab-auth

## 2. Generate RS256 signing keys

Run once. These sign every JWT your provider issues.

    openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt_private.pem
    openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

    # Print env-escaped versions (single line, \n between sections)
    echo "=== JWT_PRIVATE_KEY ==="
    printf '%s\n' "$(awk 'NF {sub(/\r/,""); printf "%s\\n",$0}' jwt_private.pem)"
    echo
    echo "=== JWT_PUBLIC_KEY ==="
    printf '%s\n' "$(awk 'NF {sub(/\r/,""); printf "%s\\n",$0}' jwt_public.pem)"

    rm -f jwt_private.pem jwt_public.pem

Copy the two outputs — they go into Netlify env vars.

## 3. Set up Neon

1. Sign up at [neon.tech](https://neon.tech) → New Project
2. Choose a region close to your Netlify deploy
3. Copy the **Connection string** (starts with `postgresql://`)
4. Open the SQL Editor → paste `src/db/schema.sql` → Run

Verify tables exist:

    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

You should see 9 tables.

## 4. Set up Upstash

1. Sign up at [console.upstash.com](https://console.upstash.com)
2. Create Database → pick a region close to Netlify
3. Open the DB → REST API tab → copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## 5. Set up Maileroo

1. Sign up at [maileroo.com](https://maileroo.com)
2. Add and verify your sending domain (SPF + DKIM in your DNS)
3. Copy the SMTP credentials:
   - Host: `smtp.maileroo.com`
   - Port: `465` (SSL) or `587` (STARTTLS)
   - Username (UUID, not your login email)
   - Password

Do not use `@gmail.com` as sender — Gmail's DMARC will reject it.

## 6. Set up irocap

irocap is open source but **not publicly hosted**. You need to deploy your own
instance before you can use captcha.

**Source:** [github.com/IROTECHLAB/irocap](https://github.com/IROTECHLAB/irocap)

Steps:

1. Fork the irocap repo to your own GitHub account
2. Deploy it to your own Vercel account (see the repo's README for the Neon DB setup it needs)
3. Open your deployed instance at `<your-irocap-url>/admin.html`
4. Register your domain — this is the domain where IrotechLab Auth runs
5. Copy the **sitekey** and **secret** for that domain

You'll plug these into Netlify env vars:

    NEXT_PUBLIC_IROCAP_SITEKEY=<sitekey>
    IROCAP_SECRET=<secret>
    NEXT_PUBLIC_IROCAP_BASE=https://your-irocap.vercel.app
    IROCAP_BASE=https://your-irocap.vercel.app

**Two env vars for the URL:** Next.js exposes `NEXT_PUBLIC_*` variables to the
browser, so the widget uses `NEXT_PUBLIC_IROCAP_BASE`. The server-side verifier
uses `IROCAP_BASE`. Both must be the same URL.

Deploying irocap takes about 10 minutes: fork → connect to Vercel → set its
`DATABASE_URL` env var → run its schema in Neon. Its repo has the full setup.



## 7. Generate a session secret

    openssl rand -base64 32

Copy the output — one line, use as-is.

## 8. Deploy to Netlify

Push to GitHub, then on Netlify:

1. Add new site → Import from Git → pick your repo
2. Build settings auto-detect from `netlify.toml`
3. Add the environment variables (see next section), each scoped to **Builds + Functions + Runtime**
4. Deploy

## 9. Environment variables

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `JWT_PRIVATE_KEY` | Step 2 output (escaped with `\n`) |
| `JWT_PUBLIC_KEY` | Step 2 output (escaped with `\n`) |
| `JWT_KEY_ID` | `iro-key-1` (or any label you want) |
| `SESSION_SECRET` | Step 7 |
| `APP_URL` | The public URL of your deployment (e.g. `https://auth.yourdomain.com`) |
| `UPSTASH_REDIS_URL` | Step 4 |
| `UPSTASH_REDIS_TOKEN` | Step 4 |
| `SMTP_HOST` | `smtp.maileroo.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Step 5 |
| `SMTP_PASS` | Step 5 |
| `SMTP_FROM` | `Your App <no-reply@yourdomain.com>` |
| `SMTP_SECURE` | `true` for 465, `false` for 587 |
| `NEXT_PUBLIC_IROCAP_SITEKEY` | Step 6 sitekey (public) |
| `IROCAP_SECRET` | Step 6 secret (server-only) |
| `IROCAP_BASE` | Optional — only if self-hosting irocap |
| `DEV_DIAGNOSTIC_SECRET` | Optional — enables `/api/dev/*` diagnostic routes (openssl rand -hex 32) |

**Note:** `NEXT_PUBLIC_IROCAP_SITEKEY` is baked into the client bundle at build
time. After changing it, redeploy with cache cleared.

## 10. Custom domain

1. Netlify → Domain management → Add domain → `auth.yourdomain.com`
2. Point a CNAME at the Netlify subdomain
3. Set the custom domain as **primary** (Netlify 301s the default netlify.app URL to it)
4. Update `APP_URL` env var to `https://auth.yourdomain.com`
5. **Deploys → Trigger deploy → Clear cache and deploy site**

## 11. Verify the deployment

    SITE=https://auth.yourdomain.com

    # Discovery
    curl -s $SITE/.well-known/openid-configuration | python -m json.tool | grep issuer

    # JWKS
    curl -s -o /dev/null -w "%{http_code}\n" $SITE/.well-known/jwks.json

    # SMTP handshake
    curl -s $SITE/api/dev/smtp-check | python -m json.tool

    # Rate limiting
    curl -s $SITE/api/dev/ratelimit-check | python -m json.tool

All four should succeed.

## Troubleshooting

### Build fails with "secrets detected"

Netlify's scanner flags public defaults like `JWT_KEY_ID`, `APP_URL`, `SMTP_HOST`.
Add them to `SECRETS_SCAN_OMIT_KEYS` in `netlify.toml`.

### Signup works but no email arrives

- Check Netlify Functions log for `[signup] verify email failed:`
- Verify SPF + DKIM for your sender domain in Maileroo
- Check the recipient's spam folder

### Rate limiting not firing

- Confirm `UPSTASH_REDIS_URL` and `UPSTASH_REDIS_TOKEN` are set and scoped to Runtime
- Hit `/api/dev/ratelimit-check` — should return `{"configured":true}`

### Captcha fails with "✗ Failed"

- Confirm `NEXT_PUBLIC_IROCAP_SITEKEY` is set in Netlify, scoped to Builds
- Check the sitekey's domain matches your deployed URL in the irocap admin panel
- Verify your browser isn't blocking the irocap domain

### Discovery document returns wrong issuer

`APP_URL` is baked into the discovery response. Update the env var and redeploy
with cache cleared.

### Custom domain shows the old netlify.app URL in redirects

Make sure the custom domain is set as **primary** in Netlify, then redeploy with
cache cleared.

---

## Updating

    git pull
    git push

Netlify auto-deploys on push. If env vars changed, use
**Deploys → Trigger deploy → Clear cache and deploy site**.

## Rolling back

Netlify → Deploys → click any previous deploy → **Publish deploy**.

---

<p align="center">
  <a href="./README.md">← Back to README</a> ·
  <a href="./INTEGRATION.md">Integration Guide</a> ·
  <a href="./CONTRIBUTING.md">Contributing</a>
</p>
