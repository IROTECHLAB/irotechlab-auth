<h1 align="center">IrotechLab Auth</h1>

<p align="center">
  <strong>OAuth 2.0 / OpenID Connect provider with email verification, password reset, captcha, webhooks, and a full developer portal.</strong><br/>
  Built on Next.js · Netlify · Neon Postgres · Upstash Redis · Maileroo SMTP · irocap (self-hosted)
</p>

<p align="center">
  <a href="https://auth.irotechlab.xi.to">Live Provider</a> ·
  <a href="https://auth.irotechlab.xi.to/widget">Widget Showcase</a> ·
  <a href="https://auth.irotechlab.xi.to/developer">Developer Portal</a> ·
  <a href="https://auth.irotechlab.xi.to/.well-known/openid-configuration">Discovery</a>
</p>

---

## Choose your path

### 🔐 I want to add "Sign in with IrotechLab" to my app

**→ [Integration Guide](./INTEGRATION.md)**

Register an app at [auth.irotechlab.xi.to/developer](https://auth.irotechlab.xi.to/developer), then follow the guide. Supports PKCE, refresh tokens, userinfo, and any spec-compliant OIDC library.

### 🔔 I want to receive webhooks

**→ [Webhooks Guide](./WEBHOOKS.md)**

Signed, timestamped events when users authorize, revoke, or when the app owner revokes everyone. Includes signature verification in Node, Python, PHP, and Go.

### 🚀 I want to deploy my own instance

**→ [Deployment Guide](./DEPLOYMENT.md)**

Run the whole stack on free-tier services. Full setup for Neon Postgres, Upstash Redis, Maileroo SMTP, irocap captcha, and Netlify.

### 🛠️ I want to contribute

**→ [Contributing Guide](./CONTRIBUTING.md)**

Project structure, code conventions, testing, PR process.

---

## Live provider

| | |
|---|---|
| **Issuer** | `https://auth.irotechlab.xi.to` |
| **Discovery** | `https://auth.irotechlab.xi.to/.well-known/openid-configuration` |
| **JWKS** | `https://auth.irotechlab.xi.to/.well-known/jwks.json` |
| **Widget** | `https://auth.irotechlab.xi.to/widget` |
| **Developer portal** | `https://auth.irotechlab.xi.to/developer` |

## Features

- **Authentication** — email + password (Argon2id), email verification, forgot password, "sign out everywhere"
- **OAuth 2.0 / OIDC** — Authorization Code + PKCE, refresh rotation, introspection, revocation, RP logout, discovery, JWKS
- **Developer portal** — register apps, redirect URIs, secret rotation, logo upload, authorized user management
- **Webhooks** — HMAC-SHA256 signed events, delivery log, secret rotation
- **Login widget** — drop-in "Continue with IrotechLab" button, three variants, any OIDC library works
- **Bot defense** — six-layer stack on all auth endpoints (headers, honeypot, timing, CSRF, captcha, rate limits)
- **UI** — light/dark theme, drag-and-drop uploads, verified badges

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Hosting | Netlify |
| Database | Neon Postgres |
| JWT / JWKS | `jose` (RS256) |
| Passwords | `@node-rs/argon2` |
| Sessions | `iron-session` |
| Rate limiting | Upstash Redis |
| Email | Maileroo SMTP (TLS) |
| Captcha | [irocap](https://github.com/IROTECHLAB/irocap) |

## Standards implemented

- RFC 6749 — OAuth 2.0 Authorization Framework
- RFC 7636 — Proof Key for Code Exchange (PKCE)
- RFC 7009 — OAuth 2.0 Token Revocation
- RFC 7662 — OAuth 2.0 Token Introspection
- OpenID Connect Core 1.0
- OpenID Connect Discovery 1.0
- OpenID Connect Session Management 1.0

## License

MIT — see [LICENSE](./LICENSE).

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) first.

<p align="center">Built with ❤️ by <a href="https://github.com/IROTECHLAB">IROTECHLAB</a></p>
