# LinkedIn Post Agent

An AI agent that writes and posts LinkedIn content **with a human in the loop**.
You open a form, it **researches** your topic and emails you **4 post angles**; you
pick one, choose whether to include an **AI-generated image**, and it writes the
post, runs it past a **reviewer agent** until it reads human and simple, and emails
you the **draft**. You **approve** (it posts via the official LinkedIn API) or
**suggest changes** and it regenerates.

**Nothing reaches LinkedIn without your explicit approval.**

```
Open form  (topic · tone · platform: LinkedIn)
   └─ submit ─────────────────────────────────────────────┐
Claude researches the web → 4 angles ──► EMAIL (4 "Choose" buttons)
   └─ you click an angle
"Add an image?"  [Generate with image] [Text only]
   └─ Claude writes the post → reviewer agent rewrites until it reads human
EMAIL: the draft  ──►  open link  ──►  [Approve & post]  or  [Suggest changes]
   ├─ Approve → LinkedIn API (or copy-paste text if no account is connected)
   └─ Suggest changes → notes go back to Claude → fresh draft → email again
```

> Email buttons link back to the app's own pages — that's how "Choose / Approve /
> Suggest changes" work without inbound-email plumbing. Anything that spends money
> or posts happens on a button *on the page*, so an email client pre-fetching a
> link can never auto-generate or auto-post.

## Stack

| Piece | What |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components) |
| Runtime | **Cloudflare Workers** via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) |
| AI | **Claude Sonnet 5** (`@anthropic-ai/sdk`) with the `web_search` server tool |
| Storage | **Workers KV** — jobs, generated images, OAuth state, LinkedIn tokens |
| Email | **Resend** HTTP API (Workers can't open SMTP sockets) |
| Images | OpenAI `gpt-image-1` (off by default) |

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in ANTHROPIC_API_KEY at minimum
npm run dev                      # http://localhost:3000
```

`next dev` runs against the real Cloudflare bindings (local KV, vars from
`wrangler.jsonc`, secrets from `.dev.vars`), so local and production hit the same
code path.

To run the actual Worker bundle locally instead:

```bash
npm run preview                  # builds + serves on http://localhost:8787
```

The agent runs with only `ANTHROPIC_API_KEY` set — without Resend it skips the
emails (drive every step from the browser instead), and without OpenAI, image
requests fall back to text-only.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server with Cloudflare bindings, port 3000 |
| `npm run preview` | Build + run the real Worker in workerd, port 8787 |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Node test runner |
| `npm run cf:build` | Build the Worker bundle without deploying |
| `npm run cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |

## First-time deploy

```bash
npx wrangler login

# 1. Create the KV namespace and paste the id into wrangler.jsonc
npx wrangler kv namespace create KV

# 2. Ship it
npm run deploy
```

Then finish the setup:

1. **Point the URLs at the deployment.** Update `PUBLIC_BASE_URL` and
   `LINKEDIN_REDIRECT_URI` in `wrangler.jsonc` → `vars` to the Worker's real URL,
   and redeploy. These are what email links and the OAuth callback use.
2. **Set the secrets** (once per key):
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put EMAIL_FROM
   npx wrangler secret put EMAIL_TO
   npx wrangler secret put LINKEDIN_CLIENT_ID
   npx wrangler secret put LINKEDIN_CLIENT_SECRET
   ```
3. **Register the redirect URI** in your LinkedIn app → Auth → Authorized redirect
   URLs: `https://<your-worker-url>/auth/linkedin/callback`.
4. Visit `/account` → **Connect LinkedIn** → Allow.

## Continuous deployment

Push to `main` and GitHub Actions deploys it.

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/workflows/ci.yml` | PRs, pushes to `dev` | typecheck · test · build the Worker bundle |
| `.github/workflows/deploy.yml` | pushes to `main`, manual | the same checks, then deploys to Cloudflare |
| `.github/workflows/secrets-sync.yml` | manual only | pushes app secrets from GitHub secrets into Worker secrets |

**Repository secrets to add** (Settings → Secrets and variables → Actions):

| Secret | Needed for |
|---|---|
| `CLOUDFLARE_API_TOKEN` | deploying — create with the "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | deploying |
| `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `OPENAI_API_KEY` | only if you want **Sync Worker secrets** to manage them |

**Optional repository variable:** `DEPLOY_URL` — when set, the deploy workflow hits
`/health` afterwards and fails if the Worker isn't answering.

## Config reference

Non-secret settings live in `wrangler.jsonc` → `vars`; secrets are Worker secrets
(and `.dev.vars` locally).

| Var | Default | Notes |
|---|---|---|
| `RESEARCH_MODEL` / `WRITER_MODEL` | `claude-sonnet-5` | `claude-opus-5` for max quality, `claude-haiku-4-5` for lowest cost |
| `PUBLIC_BASE_URL` | — | Base URL used inside emails. Must be the deployed https URL. |
| `LINKEDIN_REDIRECT_URI` | — | Must exactly match the URL registered in the LinkedIn app |
| `IMAGE_PROVIDER` | `none` | `openai` to enable image generation |
| `IMAGE_SIZE` | `1024x1024` | |

## Routes

Every route from the original Express/Hono app is preserved, so old email links
keep working.

| Route | Method | What |
|---|---|---|
| `/` | GET | the form |
| `/jobs` | POST | research the topic → 4 angles → email |
| `/jobs/:id` | GET | current state: angles · image question · draft · done |
| `/jobs/:id/select/:index` | GET | pick an angle (this is the email link) |
| `/jobs/:id/generate` | POST | write + review the post, optional image |
| `/jobs/:id/revise` | POST | regenerate with your notes |
| `/jobs/:id/approve` | POST | publish to LinkedIn |
| `/jobs/:id/image.png` | GET | the generated image, served from KV |
| `/account` · `/account/disconnect` | GET · POST | manage the LinkedIn connection |
| `/connect/linkedin` · `/auth/linkedin/callback` | GET | OAuth |
| `/privacy` · `/terms` | GET | required for LinkedIn app review |
| `/health` | GET | `{"ok":true}` |

## Project layout

```
src/
  app/                     Next.js App Router — pages + route handlers
    page.tsx                 the form
    jobs/route.ts            POST /jobs
    jobs/[id]/page.tsx       the four-state job page
    jobs/[id]/{select,generate,revise,approve,image.png}/
    account/, connect/, auth/, privacy/, terms/, health/, error/
    layout.tsx, globals.css, error.tsx, not-found.tsx
  components/              Steps, SubmitButton, PostPreview, CopyButton, LegalDoc
  config/env.ts            validated bindings + feature flags
  content/legal.ts         privacy/terms copy (shared with the tests)
  emails/templates.ts      HTML email bodies
  lib/                     anthropic client, claude web-search helper, http, logger
  services/
    jobStore.ts              jobs + images in KV
    research.service.ts      Claude + web search → 4 angles + brief
    writer.service.ts        Claude → post (simple/human/original prompt)
    reviewer.service.ts      scores human+simple, rewrites up to 2 rounds
    image.service.ts         OpenAI gpt-image-1 → KV
    email.service.ts         Resend → angles, draft, approved emails
    linkedin.service.ts      UGC post via the connected account
    linkedinAuth.ts          OAuth: auth URL, code exchange, refresh, userinfo
    connectionStore.ts       the connected account + tokens, in KV
    oauthState.ts            short-lived CSRF nonces, in KV
```

## Guardrails

- **Official LinkedIn API only.** No browser bots, cookie/session hacks, or scraping.
- **Your own feed only.** No company pages, no posting on behalf of others.
- **A human approves every post.**
- No auto-connect, no auto-DMs, no engagement pods.
