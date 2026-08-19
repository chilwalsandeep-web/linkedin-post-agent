# CLAUDE.md — LinkedIn Post Agent

> Context for Claude Code working in this repo. Read `HANDOFF.md` for the full
> history, decisions, and the phased product roadmap.

## What this is
An AI agent that writes and posts LinkedIn content **with a human in the loop**.
Flow: a web **form** (topic · tone · platform=LinkedIn) → Claude **researches** the
topic (web search) → **4 post angles emailed** to the user → user picks one →
optional **image** → Claude **writes** the post → a **reviewer agent** rewrites it
until it reads human + simple → **draft emailed** → user **approves** (posts to
LinkedIn via the official API) or **suggests changes** → it regenerates.
**Nothing posts to LinkedIn without explicit approval.**

Goal: turn this from a working single-user local tool into a multi-user product
(Taplio-style: connect your own LinkedIn, schedule, dashboard), while staying on
the **shadow-ban-safe** side of LinkedIn.

## Repo / branches
- GitHub: `chilwalsandeep-web/linkedin-post-agent` (private).
- `main` = stable. `dev` = active review branch. **Currently on `dev`.**
- Workflow: build on `dev`, owner reviews, then merge to `main`.

## Stack
- **Next.js 16** (App Router, React Server Components) on **Cloudflare Workers**
  via `@opennextjs/cloudflare`. Pages are RSC; mutations are route handlers that
  do the work and 303-redirect to a page.
- `@anthropic-ai/sdk` — Claude **Sonnet 5** for research/write/review; uses the
  `web_search` server tool. Models are env-configurable.
- OpenAI `gpt-image-1` for images (**currently off**).
- **Resend** HTTP API for email (Workers can't open SMTP sockets — no nodemailer).
- **Workers KV** for everything: `job:<id>`, `job:<id>:image`,
  `connection:current`, `oauthstate:<nonce>`.

## Config & secrets
- **Non-secret vars** live in `wrangler.jsonc` -> `vars` (`PUBLIC_BASE_URL`,
  `LINKEDIN_REDIRECT_URI`, `RESEARCH_MODEL`, `WRITER_MODEL`, `IMAGE_PROVIDER`,
  `IMAGE_SIZE`). These are committed — never put a secret there.
- **Secrets** are Worker secrets in production and `.dev.vars` locally (gitignored;
  template in `.dev.vars.example`): `ANTHROPIC_API_KEY`, `RESEND_API_KEY`,
  `EMAIL_FROM`, `EMAIL_TO`, `LINKEDIN_CLIENT_ID` (=`77bkjyko1zaqav`),
  `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AUTHOR_URN`
  (legacy fallback token), `OPENAI_API_KEY` (empty -> images off).
- The old `.env` is **dead config** — nothing reads it. Bindings come from
  `getCloudflareContext()`; `src/config/env.ts` validates them with zod and
  re-exposes an `env` object so the service layer is unchanged.

## Current state (on `dev`)
- Core flow (research → angles → write → reviewer → email → approve/post) is
  **built and tested working** with real keys, now on Next.js + Workers.
- **Connect LinkedIn (OAuth)** is built: `/account` → "Connect LinkedIn" → Allow →
  tokens stored in KV + auto-refreshed → posts go to the connected feed.
  Files: `src/services/linkedinAuth.ts`, `connectionStore.ts`, `oauthState.ts`;
  routes under `src/app/connect/`, `src/app/auth/`, `src/app/account/`.
- **CI/CD**: `.github/workflows/` — `ci.yml` (PRs + `dev`), `deploy.yml` (push to
  `main` → Cloudflare), `secrets-sync.yml` (manual).
- **Not yet deployed.** `wrangler` isn't logged in and the KV namespace id in
  `wrangler.jsonc` is still `PLACEHOLDER_REPLACE_AFTER_KV_CREATE`.

## Immediate pending (owner actions)
1. `npx wrangler login`, then `npx wrangler kv namespace create KV` and paste the
   id into `wrangler.jsonc`.
2. `npm run deploy`, then set `PUBLIC_BASE_URL` + `LINKEDIN_REDIRECT_URI` in
   `wrangler.jsonc` vars to the real Worker URL and redeploy.
3. `wrangler secret put` each secret (or add them as GitHub secrets and run the
   **Sync Worker secrets** workflow).
4. Add `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` as GitHub repo secrets so
   push-to-`main` deploys.
5. In the LinkedIn app → Auth → add the deployed redirect URL.
6. **Verify the app** with the "Sandeep Automation" Company Page + point the
   Privacy Policy URL at `/privacy`. (Member posting is self-serve — no
   multi-month review.)

## Hard constraints — keep it shadow-ban-safe (do not violate)
- **Official LinkedIn API only.** Never browser bots, cookie/session hacks, or
  scraping. (That's what gets tools like Kleo/Shield killed.)
- **Post only to the user's own feed.** No company pages, no posting on behalf of
  others (that needs a costly partner tier).
- **Human approves, or the user explicitly schedules.** No autonomous spraying.
- **No auto-connect, no auto-DMs, no scraping, no engagement pods.**
- Analytics limited to what the **official API** returns; do not build the
  cookie/extension analytics that Taplio uses.

## Commands
- `npm run dev` → http://localhost:3000 (Next dev, real CF bindings)
- `npm run preview` → http://localhost:8787 (the actual Worker in workerd)
- `npm run typecheck` · `npm test` · `npm run cf:build` · `npm run deploy`
- Every route is `force-dynamic` — they all read KV or call Claude.
- If port 8787 is stuck after a preview, kill leftover `workerd.exe` processes.

## More context
- Full journey, decisions, cost math, and the P0–P7 roadmap: **`HANDOFF.md`**.
- Roadmap report (artifact): https://claude.ai/code/artifact/e9410022-bd20-41a2-8d49-8d5decf6001b
