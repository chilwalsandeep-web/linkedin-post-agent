import nodemailer from "nodemailer";
import { env, emailEnabled, emailTo } from "../config/env";
import { logger } from "../lib/logger";
import { hasImageFile, imagePath } from "./jobStore";
import { Job } from "../types";
import { emailHeadingsHtml, emailDraftHtml, emailApprovedHtml } from "../web/views";

const transporter = emailEnabled
  ? nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    })
  : null;

function imageAttachment(job: Job) {
  if (job.hasImage && hasImageFile(job.id)) {
    return [{ filename: "post-image.png", path: imagePath(job.id), cid: "postimage" }];
  }
  return undefined;
}

async function send(subject: string, html: string, attachments?: ReturnType<typeof imageAttachment>): Promise<void> {
  if (!transporter || !emailTo) {
    logger.warn(`Email not configured — skipping "${subject}". (Drive the flow from the browser instead.)`);
    return;
  }
  await transporter.sendMail({
    from: `LinkedIn Agent <${env.GMAIL_USER}>`,
    to: emailTo,
    subject,
    html,
    attachments,
  });
  logger.info(`Email sent: "${subject}"`);
}

export function sendHeadingsEmail(job: Job): Promise<void> {
  return send(`4 post angles: ${job.topic}`, emailHeadingsHtml(job));
}

export function sendDraftEmail(job: Job): Promise<void> {
  return send("Your LinkedIn draft is ready", emailDraftHtml(job), imageAttachment(job));
}

export function sendApprovedEmail(job: Job, posted: boolean): Promise<void> {
  return send(posted ? "Posted to LinkedIn ✅" : "Approved — ready to paste", emailApprovedHtml(job, posted), imageAttachment(job));
}
