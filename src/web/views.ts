import { env } from "../config/env";
import { PostResult } from "../services/linkedin.service";
import { Job, TONES, PLATFORMS } from "../types";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

export function url(path: string): string {
  return `${env.PUBLIC_BASE_URL}${path}`;
}

// ---------- Web pages ----------

const STYLE = `
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.55;
    max-width: 680px; margin: 0 auto; padding: 32px 20px; color: #1a1a1a; background: #fafafa; }
  @media (prefers-color-scheme: dark) { body { color: #eee; background: #16181c; } }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.1rem; }
  label { display: block; font-weight: 600; margin: 18px 0 6px; }
  input, select, textarea { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px;
    font-size: 1rem; font-family: inherit; background: #fff; color: #111; }
  textarea { min-height: 120px; resize: vertical; }
  .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 20px; margin: 14px 0; }
  @media (prefers-color-scheme: dark) { .card, input, select, textarea { background: #22252b; color: #eee; border-color: #3a3f47; } }
  .btn { display: inline-block; background: #0a66c2; color: #fff !important; padding: 11px 18px; border: none;
    border-radius: 8px; font-size: 1rem; font-weight: 600; text-decoration: none; cursor: pointer; margin: 6px 8px 6px 0; }
  .btn.secondary { background: #555; }
  .btn.ghost { background: transparent; color: #0a66c2 !important; border: 1px solid #0a66c2; }
  .post { white-space: pre-wrap; background: #f4f6f8; padding: 16px; border-radius: 10px; }
  @media (prefers-color-scheme: dark) { .post { background: #1c1f24; } }
  img.preview { max-width: 100%; border-radius: 10px; margin-top: 12px; }
  .muted { color: #777; font-size: 0.9rem; }
`;

export function layout(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body>${body}</body></html>`;
}

export function formPage(): string {
  const tones = TONES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  const platforms = PLATFORMS.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("");
  return layout(
    "New LinkedIn post",
    `<h1>✍️ New LinkedIn post</h1>
     <p class="muted">Give a topic and a tone. The agent researches it and emails you 4 angles to choose from.</p>
     <form method="post" action="/jobs" class="card">
       <label for="topic">Topic to post about</label>
       <textarea id="topic" name="topic" placeholder="e.g. What AI agents mean for product managers in 2026" required></textarea>
       <label for="tone">Tone</label>
       <select id="tone" name="tone">${tones}</select>
       <label for="platform">Platform</label>
       <select id="platform" name="platform">${platforms}</select>
       <div style="margin-top:18px"><button class="btn" type="submit">Research &amp; generate headings</button></div>
     </form>`,
  );
}

export function submittedPage(job: Job): string {
  const items = job.headings
    .map(
      (h, i) =>
        `<div class="card"><b>${i + 1}.</b> ${esc(h)}<br>
         <a class="btn" href="/jobs/${job.id}/select/${i}">Choose this angle →</a></div>`,
    )
    .join("");
  return layout(
    "Headings ready",
    `<h1>📬 4 angles ready</h1>
     <p>I emailed these to you. You can also choose one right here:</p>
     ${items}
     <p class="muted">Topic: ${esc(job.topic)} · Tone: ${esc(job.tone)}</p>`,
  );
}

export function selectPage(job: Job): string {
  return layout(
    "Include an image?",
    `<h1>You chose:</h1>
     <div class="card">${esc(job.selectedHeading ?? "")}</div>
     <h2>Add an image to the post?</h2>
     <p class="muted">Generating an image takes a few extra seconds and uses your OpenAI credits.</p>
     <form method="post" action="/jobs/${job.id}/generate" style="display:inline">
       <input type="hidden" name="image" value="yes">
       <button class="btn" type="submit">Generate with image</button>
     </form>
     <form method="post" action="/jobs/${job.id}/generate" style="display:inline">
       <input type="hidden" name="image" value="no">
       <button class="btn secondary" type="submit">Text only</button>
     </form>`,
  );
}

export function draftPage(job: Job): string {
  const image = job.hasImage
    ? `<img class="preview" src="/jobs/${job.id}/image.png" alt="generated image">`
    : "";
  const history =
    job.revisionNotes.length > 0
      ? `<p class="muted">Revisions so far: ${job.revisionNotes.length}</p>`
      : "";
  const review = job.reviewNote ? `<p class="muted">🧑 Human-check: ${esc(job.reviewNote)}</p>` : "";
  return layout(
    "Review your post",
    `<h1>📝 Review your post</h1>
     <div class="card"><div class="post">${nl2br(job.draft ?? "")}</div>${image}</div>
     ${review}
     ${history}
     <form method="post" action="/jobs/${job.id}/approve">
       <button class="btn" type="submit">✅ Approve &amp; post</button>
     </form>
     <form method="post" action="/jobs/${job.id}/revise" class="card">
       <label for="notes">Or suggest changes (goes back to the AI for a fresh draft)</label>
       <textarea id="notes" name="notes" placeholder="e.g. Make it punchier, add a concrete example, drop the last hashtag" required></textarea>
       <div style="margin-top:12px"><button class="btn ghost" type="submit">Regenerate with changes</button></div>
     </form>
     <p class="muted">Angle: ${esc(job.selectedHeading ?? "")}</p>`,
  );
}

export function approvedPage(job: Job, result: PostResult): string {
  const image = job.hasImage
    ? `<img class="preview" src="/jobs/${job.id}/image.png" alt="generated image">`
    : "";
  const body = result.posted
    ? `<h1>🎉 Posted to LinkedIn</h1><div class="card"><div class="post">${nl2br(job.draft ?? "")}</div>${image}</div>`
    : `<h1>✅ Approved — ready to post</h1>
       <p>LinkedIn auto-posting isn't enabled yet, so copy the text below and paste it into LinkedIn${
         job.hasImage ? " (image attached in the email / shown below)" : ""
       }.</p>
       <div class="card"><div class="post">${nl2br(job.draft ?? "")}</div>${image}</div>`;
  return layout("Done", body);
}

export function errorPage(message: string): string {
  return layout("Error", `<h1>⚠️ Something went wrong</h1><div class="card">${esc(message)}</div><p><a class="btn" href="/">Start over</a></p>`);
}

// ---------- Email templates ----------

export function emailHeadingsHtml(job: Job): string {
  const items = job.headings
    .map(
      (h, i) =>
        `<tr><td style="padding:10px 0">
           <b>${i + 1}.</b> ${esc(h)}<br>
           <a href="${url(`/jobs/${job.id}/select/${i}`)}"
              style="display:inline-block;margin-top:6px;background:#0a66c2;color:#fff;padding:9px 16px;border-radius:6px;text-decoration:none">Choose this angle</a>
         </td></tr>`,
    )
    .join("");
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <h2>4 angles for: ${esc(job.topic)}</h2>
    <p style="color:#555">Tone: ${esc(job.tone)}. Pick one and I'll research + write the full post.</p>
    <table style="width:100%">${items}</table>
  </div>`;
}

export function emailDraftHtml(job: Job): string {
  const image = job.hasImage
    ? `<img src="cid:postimage" alt="post image" style="max-width:100%;border-radius:8px;margin-top:12px">`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <h2>Your draft is ready</h2>
    <div style="white-space:pre-wrap;background:#f4f6f8;padding:16px;border-radius:8px">${esc(job.draft ?? "")}</div>
    ${image}
    ${job.reviewNote ? `<p style="color:#777;font-size:13px">🧑 Human-check: ${esc(job.reviewNote)}</p>` : ""}
    <p style="margin-top:16px">
      <a href="${url(`/jobs/${job.id}`)}"
         style="display:inline-block;background:#0a66c2;color:#fff;padding:11px 18px;border-radius:6px;text-decoration:none">Open to approve or suggest changes</a>
    </p>
    <p style="color:#777;font-size:13px">Angle: ${esc(job.selectedHeading ?? "")}</p>
  </div>`;
}

export function emailApprovedHtml(job: Job, posted: boolean): string {
  const image = job.hasImage
    ? `<img src="cid:postimage" alt="post image" style="max-width:100%;border-radius:8px;margin-top:12px">`
    : "";
  const heading = posted ? "🎉 Posted to LinkedIn" : "✅ Approved — copy &amp; paste this to LinkedIn";
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
    <h2>${heading}</h2>
    <div style="white-space:pre-wrap;background:#f4f6f8;padding:16px;border-radius:8px">${esc(job.draft ?? "")}</div>
    ${image}
  </div>`;
}
