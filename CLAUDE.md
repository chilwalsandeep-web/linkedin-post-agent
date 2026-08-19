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
- Node + TypeScript, **Express** (server-rendered HTML pages + email templates).
- `@anthropic-ai/sdk` — Claude **Sonnet 5** for research/write/review; uses the
  `web_search` server tool. Models are env-configurable.
- OpenAI `gpt-image-1` for images (**currently off**).
- `nodemailer` via **Gmail SMTP** for email.
- **File-based storage** (no DB yet): `data/jobs/<id>.json`, `data/connections.json`.

## Secrets live in `.env` (gitignored — NEVER commit)
Names only (values are in `.env`): `ANTHROPIC_API_KEY`, `GMAIL_USER`,
`GMAIL_APP_PASSWORD`, `LINKEDIN_CLIENT_ID` (=`77bkjyko1zaqav`),
`LINKEDIN_CLIENT_SECRET` (⏳ owner still to paste), `LINKEDIN_REDIRECT_URI`,
`LINKEDIN_ACCESS_TOKEN` + `LINKEDIN_AUTHOR_URN` (legacy fallback token),
`OPENAI_API_KEY` (empty → images off). Also gitignored: `data/jobs/`,
`data/connections.json`.

## Current state (as of the handoff)
- Core flow (research → headings → write → reviewer → email → approve/post) is
  **built and tested working** with real keys.
- **Connect LinkedIn (OAuth)** is built on `dev`: `/account` → "Connect LinkedIn"
  → Allow → tokens stored + auto-refreshed → posts go to the connected feed.
  Files: `src/services/linkedinAuth.ts`, `src/services/connectionStore.ts`;
  routes in `src/server.ts` (`/connect/linkedin`, `/auth/linkedin/callback`,
  `/account`).

## Immediate pending (owner actions)
1. Paste **Primary Client Secret** into `LINKEDIN_CLIENT_SECRET=` in `.env`.
2. In the LinkedIn app → Auth → add redirect URL `http://localhost:3000/auth/linkedin/callback`.
3. **Verify the app** with the "Sandeep Automation" Company Page + add a real
   Privacy Policy URL. (Member posting is self-serve — no multi-month review.)

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
- `npm run dev` → http://localhost:3000
- `npm run typecheck` · `npm run build`
- If a restart fails with port 3000 in use, a stale `npx` child is holding it —
  kill the listener on 3000, then rerun.

## More context
- Full journey, decisions, cost math, and the P0–P7 roadmap: **`HANDOFF.md`**.
- Roadmap report (artifact): https://claude.ai/code/artifact/e9410022-bd20-41a2-8d49-8d5decf6001b
