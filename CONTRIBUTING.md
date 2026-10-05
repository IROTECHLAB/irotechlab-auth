# Contributing to IrotechLab Auth

Thanks for helping improve the provider. This guide covers project structure,
conventions, and the PR process.

**Not a contributor?** If you want to:
- Integrate "Sign in with IrotechLab" into your app → [INTEGRATION.md](./INTEGRATION.md)
- Deploy your own instance → [DEPLOYMENT.md](./DEPLOYMENT.md)
- Receive webhooks → [WEBHOOKS.md](./WEBHOOKS.md)

---

## Project structure

    irotechlab-auth/
    ├── src/
    │   ├── app/                     # Next.js App Router
    │   │   ├── api/                 # API routes (Netlify Functions)
    │   │   │   ├── auth/            # signup, login, verify, ...
    │   │   │   ├── oauth/           # authorize, token, userinfo, ...
    │   │   │   ├── dev/             # developer portal endpoints
    │   │   │   └── csrf/            # signed CSRF nonce
    │   │   ├── account/             # user profile
    │   │   ├── developer/           # app CRUD UI
    │   │   ├── login/               # sign-in page
    │   │   ├── signup/              # register page
    │   │   ├── oauth/consent/       # OAuth consent screen
    │   │   ├── widget/              # login button showcase
    │   │   └── well-known/          # OIDC discovery + JWKS
    │   ├── components/              # React components
    │   ├── db/
    │   │   └── schema.sql           # Postgres schema
    │   └── lib/                     # Server-side utilities
    │       ├── db.ts                # Neon client
    │       ├── jwt.ts               # jose RS256 signing
    │       ├── keys.ts              # JWKS export
    │       ├── password.ts          # Argon2id
    │       ├── session.ts           # iron-session
    │       ├── irocap.ts            # captcha verifier
    │       ├── webhooks.ts          # HMAC emitter
    │       ├── bot-check.ts         # layer 1
    │       ├── csrf.ts              # layer 4
    │       └── rate-limit.ts        # layer 6
    ├── public/                      # static assets
    ├── scripts/                     # migrations, seeds, key gen
    ├── netlify.toml                 # deploy config
    └── package.json

## Local development

Netlify builds install dependencies. To run locally:

    npm install
    cp .env.example .env
    # fill in env vars
    npm run dev

Then open `http://localhost:3000`.

You need Neon, Upstash, Maileroo, and irocap credentials even for local dev.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for how to get each.

## Code conventions

- **TypeScript strict mode** — no `any` unless truly unavoidable
- **Zod** for every request body validation
- **`@/` path alias** for `src/` — `import { sql } from '@/lib/db'`
- **Server components by default**, client components only when you need hooks
- **Comments explain *why*, not *what***
- **No hand-rolled crypto** — use `jose`, `@node-rs/argon2`, `iron-session`

## Adding a new API route

1. Create `src/app/api/<path>/route.ts`
2. Export a handler for each HTTP method:

       export async function POST(req: NextRequest) {
         // 1. auth check
         // 2. rate limit
         // 3. validate with zod
         // 4. do the work
         // 5. return NextResponse.json({ ... })
       }

3. Route handlers run on Node runtime (`export const runtime = 'nodejs'` for crypto)
4. Add zod validation — never trust the client

## Adding a new OAuth scope

1. Add it to `allowedScopes` in `src/lib/validators.ts`
2. Include it in the consent screen `src/app/oauth/consent/page.tsx`
3. Return the associated claims in `src/app/api/oauth/userinfo/route.ts`
4. Add it to the default in `src/app/api/dev/apps/route.ts`

## Testing

There's no unit test suite yet. Manual testing checklist for changes:

1. `npx tsc --noEmit` — type check
2. Sign up a fresh user, receive verification email
3. Verify email, sign in
4. Register an OAuth app at `/developer/new`
5. Complete the OAuth flow with a test client
6. Trigger a webhook, verify delivery in the Deliveries log

## Commit messages

Short imperative subject line. Reference what changed, not why (unless it's
non-obvious).

    Fix TS narrowing on session.userId in authorize route
    Add webhooks: HMAC signer, delivery log, dev UI
    Docs: update domain to auth.irotechlab.xi.to

Avoid: "fix bug", "update stuff", "wip".

## Pull requests

1. Fork the repo
2. Create a branch: `git checkout -b fix/short-description`
3. Make your change
4. Run `npx tsc --noEmit` — must pass clean
5. Commit, push, open a PR
6. Describe what changed and why

## Security

Found a vulnerability? **Don't open a public issue.** Email the maintainers
privately first.

Do not commit:
- `.env` files
- private keys (`jwt_private.pem`)
- real secrets in code

## Questions

Open a discussion or an issue with the `question` label.

---

<p align="center">
  <a href="./README.md">← Back to README</a>
</p>
