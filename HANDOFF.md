# HANDOFF — full context for continuing this project

This file exists so a fresh Claude Code session (in a new window, in this folder)
has the complete story. `CLAUDE.md` has the essentials; this is the deep context.

Owner: Sandeep Chilwal (chilwalsandeep@gmail.com), on Windows. Not a heavy coder —
prefers clear step-by-step guidance and asks for keys/decisions when needed.

## The journey so far
1. Started as an **n8n** (no-code) prototype for AI-assisted LinkedIn posting.
2. Rebuilt in **custom code (Node/TS)**. An early design used RSS + Telegram; the
   owner then gave a clearer spec, so we pivoted to the **current form + email**
   flow (below) and deleted the RSS/Telegram code.
3. Made the writing **human/simple/original** (kill AI tells) and added a
   **reviewer agent** that scores + rewrites drafts.
4. Wired **real posting** to LinkedIn via the official API (owner's own account).
5. Building the **multi-user product**: started with **Connect LinkedIn (OAuth)**
   on the `dev` branch.

## Current product flow (what the code does)
`GET /` form (topic, tone, platform) → `POST /jobs` runs research (Claude +
`web_search`) → 4 headings, emailed → `GET /jobs/:id/select/:i` → image? →
`POST /jobs/:id/generate` writes the post + runs the reviewer → draft emailed →
`GET /jobs/:id` shows draft → `POST /jobs/:id/approve` (posts) or
`POST /jobs/:id/revise` (regenerate with notes). Email buttons link back to the
app's own pages; money/posting actions are POST buttons on-page (so email link
prefetch can't auto-trigger).

## File map
```
src/
  app/                     Next.js App Router (pages + route handlers)
    page.tsx                 the form
    layout.tsx globals.css   shell, nav, footer, design tokens
    error.tsx not-found.tsx  boundaries
    jobs/route.ts            POST /jobs  -> research + 4 angles + email
    jobs/[id]/page.tsx       one page, four states (angles / image? / draft / done)
    jobs/[id]/select/[index]/route.ts   the email link; sets the angle
    jobs/[id]/generate|revise|approve/route.ts
    jobs/[id]/image.png/route.ts        serves the image from KV
    account/ connect/ auth/  OAuth + connection management
    privacy/ terms/ error/ health/
  components/              Steps, SubmitButton, PostPreview, CopyButton, LegalDoc
  config/env.ts            zod-validated Worker bindings + feature flags
  content/legal.ts         privacy/terms copy as data (the tests assert on it)
  emails/templates.ts      HTML email bodies (angles, draft, approved)
  lib/                     anthropic, claude web-search helper, http, json, logger
  services/
    jobStore.ts              jobs + images in KV (job:<id>, job:<id>:image)
    oauthState.ts            short-lived CSRF nonces in KV
    research.service.ts      Claude + web search -> 4 angles + brief
    writer.service.ts        Claude -> post (simple/human/original prompt)
    reviewer.service.ts      scores human+simple, rewrites up to 2 rounds
    image.service.ts         OpenAI gpt-image-1 (off unless OPENAI_API_KEY set)
    email.service.ts         Resend HTTP API -> angles, draft, approved emails
    linkedin.service.ts      UGC post via connected account (env token fallback)
    linkedinAuth.ts          OAuth: auth URL, code exchange, refresh, userinfo
    connectionStore.ts       the connected account + tokens (KV connection:current)
next.config.ts             + initOpenNextCloudflareForDev() for `next dev`
open-next.config.ts        Cloudflare adapter config (no ISR cache needed)
wrangler.jsonc             Worker name, KV binding, non-secret vars
types/cloudflare-runtime.d.ts  minimal KVNamespace/Fetcher shim (see gotchas)
.github/workflows/         ci.yml, deploy.yml, secrets-sync.yml
```

## Architecture notes (Next.js on Workers)
- **Why a shape change at all:** the app moved Express -> Hono/Workers -> Next.js on
  Workers (`@opennextjs/cloudflare`). Every URL and every prompt is unchanged; only
  the framework around them moved.
- **Bindings:** there is no `process.env`. `src/config/env.ts` calls
  `getCloudflareContext().env`, validates it with zod once per isolate, and
  re-exposes a plain `env` object through a `Proxy`, so `services/` and `lib/` read
  `env.ANTHROPIC_API_KEY` exactly as they always did.
- **Mutations:** route handlers do the work then return a **303 redirect** to a page
  (post/redirect/get), so a refresh never re-runs a paid Claude call. GET
  `/jobs/:id/select/:i` stays a GET because it is the link inside the email.
- **Every route is `force-dynamic`** — they all read KV or call Claude, so nothing
  is prerendered except `/privacy`, `/terms` and the 404.

## The reviewer agent (owner cares a lot about this)
Writer prompt targets plain, simple, human, ORIGINAL text and bans AI clichés
("game-changer", the "it's not X, it's Y" formula, rhetorical-question bookends,
buzzwords). `reviewer.service.ts` then: `score()` (human + simple, 1–10) →
if below 8, `rewrite()` (plain text, no JSON) → re-score, up to 2 rounds. Verdict
shown on the draft page + email (`job.reviewNote`). Note: "remove plagiarism" is
handled by instruction (paraphrase, original wording), NOT a real plagiarism scan —
a true scan (Copyleaks/Originality.ai) is a possible later add-on.

## LinkedIn specifics
- One app owned by the owner: **Client ID `77bkjyko1zaqav`** (app name "n8n
  Automation", associated Company Page "Sandeep Automation").
- Scopes in use: `openid profile email w_member_social`.
- **Member posting (`w_member_social` / "Share on LinkedIn") is SELF-SERVE** — other
  users can authorize and post to their OWN feed with NO multi-month review. The
  heavy "Marketing Developer Platform" review is only for company-page posting /
  marketing analytics, which we deliberately avoid.
- To make it usable by others: **verify the app** with the Company Page + a real
  Privacy Policy URL. That's it.
- Redirect URI (register in the app): the deployed
  `https://<worker-url>/auth/linkedin/callback`, plus
  `http://localhost:3000/auth/linkedin/callback` for local dev. It must match
  `LINKEDIN_REDIRECT_URI` exactly.
- Access tokens ~60 days; refresh tokens (~1 yr) auto-refresh in `linkedinAuth.ts`
  if issued.

## Cost math (for pricing)
Per post: text-only ~$0.08–0.13 on Sonnet 5; ~$0.03–0.05 if research/reviewer run
on Haiku; +~$0.03 with an image. Web search $0.01/search. At realistic posting
volumes (people post a handful/month), token cost is tiny — infra + Stripe fees
dominate.

## Productization roadmap (P0–P7)
- **P0 Connect LinkedIn** — *in progress on `dev`.* OAuth connect, token store,
  auto-refresh, post via connected account. Owner: paste secret, register redirect
  URI, verify app + privacy policy.
- **P1 Multi-user foundation** — accounts (sign-up/login), Postgres, per-user
  **encrypted** tokens, background job queue. Reuse the OffPath stack patterns.
  Decisions needed: hosting (Render/Railway/Fly) + domain; auth (email+pw vs Google).
- **P2 Scheduling** — date/time picker + queue + worker that posts on schedule via
  official API; states queued→published→failed; best-time suggestions (general
  data, not scraping).
- **P3 Dashboard** — drafts/scheduled/published/failed lists, calendar, edit/
  reschedule/cancel, credits remaining.
- **P4 Safe analytics** — delivery status + official-API metrics only. Rich
  impressions/profile-views require the cookie/extension trick LinkedIn kills — do
  NOT build it.
- **P5 Billing** — Stripe; 1 credit = 1 published post. Suggested tiers: Free **5**,
  Plus **~$12 / 20 posts**, Pro **~$24 / 40 posts** (realistic monthly volumes).
- **P6 Personalization** — per-user **voice profiles** (paste past posts → style
  guide), style controls, custom rules, learns from edits. This is the moat vs
  Taplio's generic output.
- **P7 Marketing site + launch** — wire the owner's website template to sign-up;
  closed beta → open.

Also considered/safe extras: content calendar, post-idea generator, "link in first
comment" option (reach-safe), multiple saved voices, team seats later.

## Gotchas / notes
- **Don't add `@cloudflare/workers-types` to tsconfig `types`.** It redeclares DOM
  globals (`Request`, `Response`, `fetch`) and collides with the `DOM` lib that
  Next/React need — `NextResponse` starts failing to typecheck. Instead,
  `cloudflare-env.d.ts` is generated with `--include-runtime false` and
  `types/cloudflare-runtime.d.ts` hand-declares just `KVNamespace` + `Fetcher`.
  Rerun `npm run cf-typegen` after editing `wrangler.jsonc`.
- **`PUBLIC_BASE_URL` and `LINKEDIN_REDIRECT_URI` live in `wrangler.jsonc` vars**
  and point at the deployed Worker. `.dev.vars` overrides them with localhost for
  local dev. The redirect URI must match the LinkedIn app registration exactly.
- Email links point at `PUBLIC_BASE_URL` — they only work once it is a real public
  URL.
- The old `.env` / `data/` directory are leftovers from the Express era. Nothing
  reads them; jobs and tokens are in KV.
- Windows: `npm run preview` can leave `workerd.exe` holding port 8787 after a
  kill. Kill the stray processes before rerunning.
- Git shows LF→CRLF warnings on Windows — harmless.

## Immediate next steps
1. `npx wrangler login` → `npx wrangler kv namespace create KV` → paste the id into
   `wrangler.jsonc` → `npm run deploy`.
2. Set `PUBLIC_BASE_URL` + `LINKEDIN_REDIRECT_URI` to the deployed URL, redeploy,
   and register that redirect URI in the LinkedIn app.
3. Push the secrets (`wrangler secret put`, or GitHub secrets + the **Sync Worker
   secrets** workflow), and add `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` so
   push-to-`main` deploys.
4. Test Connect LinkedIn end-to-end (`/account` → Connect → Allow → approve a draft
   → confirm it posts).
5. Point the LinkedIn app's Privacy Policy URL at the deployed `/privacy` and verify
   the app with the Company Page.
6. Start **P1 (multi-user foundation)** on `dev` — the single-tenant KV keys
   (`connection:current`) are the thing to shard per user.
