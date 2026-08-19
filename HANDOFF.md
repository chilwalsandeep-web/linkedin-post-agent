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
  config/env.ts            validated env + feature flags
  lib/                     anthropic client, claude web-search helper, logger, json
  services/
    jobStore.ts            per-job JSON (+ <id>.png image)
    research.service.ts    Claude + web search → 4 headings + brief
    writer.service.ts      Claude → post (simple/human/original prompt)
    reviewer.service.ts    scores human+simple, rewrites up to 2 rounds
    image.service.ts       OpenAI gpt-image-1 (off unless OPENAI_API_KEY set)
    email.service.ts       nodemailer/Gmail → headings, draft, approved emails
    linkedin.service.ts    UGC post via connected account (env token fallback)
    linkedinAuth.ts        OAuth: auth URL, code exchange, refresh, userinfo
    connectionStore.ts     stores the connected account + tokens (data/connections.json)
  web/views.ts             HTML for pages + email templates
  server.ts                Express routes (the whole flow + /account + OAuth)
```

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
- Redirect URI (register in the app): `http://localhost:3000/auth/linkedin/callback`
  (add the production URL later).
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
- Windows: restarts can fail with **port 3000 in use** because `npx ts-node`
  spawns a child node that keeps the port after the parent is killed. Kill the
  listener on 3000 first. (This repo's smoke tests launch via
  `node -e "require('ts-node/register'); require('./src/server.ts')"` to avoid the
  orphan.)
- Git shows LF→CRLF warnings on Windows — harmless.
- Email links point at `PUBLIC_BASE_URL` (localhost for now) — only work while the
  server runs on that machine. For remote use, deploy and set `PUBLIC_BASE_URL`.

## Immediate next steps
1. Owner adds `LINKEDIN_CLIENT_SECRET` to `.env`, registers the redirect URI,
   verifies the app + adds a privacy policy URL.
2. Test Connect LinkedIn end-to-end (`/account` → Connect → Allow → approve a draft
   → confirm it posts).
3. Start **P1 (multi-user foundation)** on `dev`.
4. Draft Privacy Policy + Terms (needed for the LinkedIn app + storing user tokens).
