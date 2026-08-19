import { esc, url } from "../lib/html";
import { Job } from "../types";

// Emails are plain HTML strings (not React) — mail clients need inline styles
// and a table-ish layout, and these are rendered outside the request/render tree.

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
