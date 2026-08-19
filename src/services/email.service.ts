import { env, emailEnabled, emailTo } from "../config/env";
import { logger } from "../lib/logger";
import { loadImage } from "./jobStore";
import { Job } from "../types";
import { emailHeadingsHtml, emailDraftHtml, emailApprovedHtml } from "../emails/templates";

// HTTP email via Resend (Workers can't open SMTP sockets for nodemailer).
const RESEND_URL = "https://api.resend.com/emails";

interface Attachment {
  filename: string;
  content: string; // base64
  content_id?: string; // for inline cid: references
}

async function imageAttachment(job: Job): Promise<Attachment[] | undefined> {
  if (!job.hasImage) return undefined;
  const bytes = await loadImage(job.id);
  if (!bytes) return undefined;
  return [{ filename: "post-image.png", content: arrayBufferToBase64(bytes), content_id: "postimage" }];
}

async function send(subject: string, html: string, attachments?: Attachment[]): Promise<void> {
  if (!emailEnabled()) {
    logger.warn(`Email not configured — skipping "${subject}". (Drive the flow from the browser instead.)`);
    return;
  }
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [emailTo()],
      subject,
      html,
      ...(attachments ? { attachments } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend API error ${res.status}: ${detail}`);
  }
  logger.info(`Email sent: "${subject}"`);
}

export function sendHeadingsEmail(job: Job): Promise<void> {
  return send(`4 post angles: ${job.topic}`, emailHeadingsHtml(job));
}

export async function sendDraftEmail(job: Job): Promise<void> {
  return send("Your LinkedIn draft is ready", emailDraftHtml(job), await imageAttachment(job));
}

export async function sendApprovedEmail(job: Job, posted: boolean): Promise<void> {
  return send(
    posted ? "Posted to LinkedIn ✅" : "Approved — ready to paste",
    emailApprovedHtml(job, posted),
    await imageAttachment(job),
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
