# LinkedIn Post Agent

A coded automation agent (the custom-code rebuild of the n8n workflow). You open a
form, it **researches** your topic and emails you **4 post angles**; you pick one,
choose whether to include an **AI-generated image**, and it writes the post and
emails you the **draft**. You **approve** (posts to LinkedIn, or gives you copy‑paste
text) or **suggest changes** and it regenerates.

```
Open form  (topic · tone · platform: LinkedIn)
   └─ submit ─────────────────────────────────────────────┐
Claude researches the web → 4 headings ──► EMAIL (4 "Choose" buttons)
   └─ you click a heading
Landing page: "Include an image?"  [With image] [Text only]
   └─ Claude researches + writes the post (+ OpenAI image if chosen)
EMAIL: the draft  ──►  open link  ──►  [Approve & post]  or  [Suggest changes]
   ├─ Approve → LinkedIn API (or copy‑paste text emailed to you)
   └─ Suggest changes → notes go back to Claude → fresh draft → email again
```

Built with **Node + TypeScript**, **Express** (form + web pages), **Claude** (research
via web search + writing), **OpenAI** (images), **nodemailer/Gmail** (email).

> Email buttons link back to the app's own web pages — that's how "Choose / Approve /
> Suggest changes" work reliably without extra inbound‑email plumbing. To spend money
> or post, you click a button *on the page* (not the email link), so an email client
> pre‑fetching a link can never auto‑generate or auto‑post.

## Setup

```bash
cd linkedin-agent
npm install
cp .env.example .env      # fill in the keys below
npm run dev               # http://localhost:3000
```

Open **http://localhost:3000**, submit the form, then follow the emails (or drive the
whole thing from the browser — every step also renders as a page).

### Required keys

| Key | Where | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Research + writing. Uses Claude's web‑search tool (small per‑search cost). |
| `GMAIL_USER` + `GMAIL_APP_PASSWORD` | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) | Needs 2‑Step Verification on. The app password is 16 chars. |
| `OPENAI_API_KEY` | platform.openai.com/api-keys | Only used when you pick **with image** (`gpt-image-1`). |

The agent still runs with only `ANTHROPIC_API_KEY` — without Gmail it just skips the
emails (drive it from the browser); without OpenAI, image requests fall back to
text‑only.

### LinkedIn (optional — copy‑paste until approved)

Auto‑posting needs a LinkedIn developer app with the **`w_member_social`** scope,
which requires approval (not instant). Until then leave `LINKEDIN_*` blank: **Approve**
emails you the finished post (with the image attached) to paste yourself.

When approved, set:
- `LINKEDIN_ACCESS_TOKEN` — a member token with `w_member_social`.
- `LINKEDIN_AUTHOR_URN` — your member URN, e.g. `urn:li:person:xxxx`. Get it from
  `GET https://api.linkedin.com/v2/userinfo` (the `sub` field) using your token.

The code already handles posting **text and image** — it's just dormant until those
two vars are set.

## Config reference

| Var | Default | Notes |
|---|---|---|
| `RESEARCH_MODEL` / `WRITER_MODEL` | `claude-sonnet-5` | `claude-opus-4-8` for max quality, `claude-haiku-4-5` for lowest cost. |
| `PORT` | `3000` | |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Base URL used inside emails. Set to your public URL if you deploy. |
| `IMAGE_PROVIDER` | `openai` | `none` to disable images entirely. |
| `IMAGE_SIZE` | `1024x1024` | |

> **Running locally:** email links point at `PUBLIC_BASE_URL`. On your own machine
> that's `localhost`, which only works while the app is running on that same machine.
> Fine for personal use. To use it from your phone / anywhere, deploy it (Render,
> Railway, Fly, a small VPS) and set `PUBLIC_BASE_URL` to the deployed https URL.

## Project layout

```
src/
  config/env.ts            validated env + feature flags
  lib/                     anthropic client, claude web-search helper, logger, json
  services/
    jobStore.ts            file-backed job state (data/jobs/<id>.json + <id>.png)
    research.service.ts    Claude + web search → 4 headings + brief
    writer.service.ts      Claude → full post (+ revise); image-prompt builder
    image.service.ts       OpenAI gpt-image-1 → data/jobs/<id>.png
    email.service.ts       nodemailer/Gmail → headings, draft, approved emails
    linkedin.service.ts    UGC post (text + image); dormant until configured
  web/views.ts             HTML for pages + email templates
  server.ts                Express routes (the flow)
data/jobs/                 per-job JSON + images (git-ignored)
```

## Roadmap

1. ✅ This flow, single user, running locally.
2. Deploy so email links work from anywhere.
3. Turn on LinkedIn auto‑post once the app is approved.
4. Multi‑user (accounts, per‑user config → Postgres), then billing.
5. More platforms (X, etc.).
```
