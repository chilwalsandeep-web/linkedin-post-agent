import express, { Request, Response } from "express";
import fs from "fs";
import { env, emailEnabled, imageEnabled, linkedinEnabled } from "./config/env";
import { logger } from "./lib/logger";
import { createJob, loadJob, saveJob, imagePath, hasImageFile } from "./services/jobStore";
import { generateHeadings } from "./services/research.service";
import { writePost, buildImagePrompt } from "./services/writer.service";
import { humanize } from "./services/reviewer.service";
import { generateImage } from "./services/image.service";
import { publishPost } from "./services/linkedin.service";
import { sendHeadingsEmail, sendDraftEmail, sendApprovedEmail } from "./services/email.service";
import {
  formPage,
  submittedPage,
  selectPage,
  draftPage,
  approvedPage,
  errorPage,
} from "./web/views";
import { Job, Platform, TONES, Tone, PLATFORMS } from "./types";

const app = express();
app.use(express.urlencoded({ extended: true }));

type Handler = (req: Request, res: Response) => Promise<void>;
const wrap =
  (h: Handler) =>
  (req: Request, res: Response): void => {
    h(req, res).catch((err: unknown) => {
      logger.error("Request failed:", (err as Error).message);
      res.status(500).send(errorPage((err as Error).message));
    });
  };

function getJobOr404(req: Request, res: Response): Job | null {
  const job = loadJob(req.params.id);
  if (!job) {
    res.status(404).send(errorPage("That job no longer exists. Start over."));
    return null;
  }
  return job;
}

// --- Form (the "trigger") ---
app.get("/", (_req, res) => res.send(formPage()));

app.get("/health", (_req, res) => res.json({ ok: true }));

// --- Submit form -> research + 4 headings -> email ---
app.post(
  "/jobs",
  wrap(async (req, res) => {
    const topic = String(req.body.topic ?? "").trim();
    const tone = (TONES.includes(req.body.tone) ? req.body.tone : TONES[0]) as Tone;
    const platform = (PLATFORMS.includes(req.body.platform) ? req.body.platform : "LinkedIn") as Platform;
    if (!topic) {
      res.status(400).send(errorPage("Please enter a topic."));
      return;
    }

    const job = createJob({ topic, tone, platform });
    logger.info(`Job ${job.id} created: "${topic}" (${tone})`);

    const { brief, headings } = await generateHeadings(topic, tone);
    job.brief = brief;
    job.headings = headings;
    saveJob(job);

    if (headings.length === 0) {
      res.status(500).send(errorPage("Couldn't generate headings — try a more specific topic."));
      return;
    }

    await sendHeadingsEmail(job).catch((e) => logger.warn("Headings email failed:", (e as Error).message));
    res.send(submittedPage(job));
  }),
);

// --- Choose a heading (email/browser link) -> ask about image ---
app.get(
  "/jobs/:id/select/:index",
  wrap(async (req, res) => {
    const job = getJobOr404(req, res);
    if (!job) return;
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0 || index >= job.headings.length) {
      res.status(400).send(errorPage("Invalid heading selection."));
      return;
    }
    job.selectedHeading = job.headings[index];
    saveJob(job);
    res.send(selectPage(job));
  }),
);

// --- Generate the post (+ optional image) -> email draft ---
app.post(
  "/jobs/:id/generate",
  wrap(async (req, res) => {
    const job = getJobOr404(req, res);
    if (!job) return;
    if (!job.selectedHeading) {
      res.status(400).send(errorPage("Pick a heading first."));
      return;
    }

    job.withImage = String(req.body.image) === "yes";
    job.status = "writing";
    saveJob(job);

    job.draft = await writePost(job);
    const reviewed = await humanize(job, job.draft);
    job.draft = reviewed.text;
    job.reviewNote = reviewed.note;

    if (job.withImage && imageEnabled) {
      try {
        job.hasImage = await generateImage(job.id, buildImagePrompt(job));
      } catch (e) {
        logger.warn("Image generation failed, continuing text-only:", (e as Error).message);
        job.hasImage = false;
      }
    }

    job.status = "review";
    saveJob(job);

    await sendDraftEmail(job).catch((e) => logger.warn("Draft email failed:", (e as Error).message));
    res.send(draftPage(job));
  }),
);

// --- View current draft ---
app.get(
  "/jobs/:id",
  wrap(async (req, res) => {
    const job = getJobOr404(req, res);
    if (!job) return;
    if (job.status === "posted" || job.status === "approved") {
      res.send(approvedPage(job, { posted: job.postedToLinkedIn, message: "" }));
      return;
    }
    if (!job.draft) {
      res.send(job.selectedHeading ? selectPage(job) : submittedPage(job));
      return;
    }
    res.send(draftPage(job));
  }),
);

// --- Suggest changes -> regenerate ---
app.post(
  "/jobs/:id/revise",
  wrap(async (req, res) => {
    const job = getJobOr404(req, res);
    if (!job) return;
    const notes = String(req.body.notes ?? "").trim();
    if (!notes) {
      res.status(400).send(errorPage("Please describe the changes you want."));
      return;
    }
    job.revisionNotes.push(notes);
    job.status = "writing";
    saveJob(job);

    job.draft = await writePost(job);
    const reviewed = await humanize(job, job.draft);
    job.draft = reviewed.text;
    job.reviewNote = reviewed.note;
    job.status = "review";
    saveJob(job);

    await sendDraftEmail(job).catch((e) => logger.warn("Draft email failed:", (e as Error).message));
    res.send(draftPage(job));
  }),
);

// --- Approve -> post to LinkedIn or copy-paste ---
app.post(
  "/jobs/:id/approve",
  wrap(async (req, res) => {
    const job = getJobOr404(req, res);
    if (!job || !job.draft) {
      if (!res.headersSent) res.status(400).send(errorPage("Nothing to approve yet."));
      return;
    }
    const result = await publishPost(job.draft, hasImageFile(job.id) ? imagePath(job.id) : null);
    job.postedToLinkedIn = result.posted;
    job.status = result.posted ? "posted" : "approved";
    saveJob(job);

    await sendApprovedEmail(job, result.posted).catch((e) => logger.warn("Approved email failed:", (e as Error).message));
    res.send(approvedPage(job, result));
  }),
);

// --- Serve a job's generated image ---
app.get("/jobs/:id/image.png", (req, res) => {
  const p = imagePath(req.params.id);
  if (!fs.existsSync(p)) {
    res.status(404).end();
    return;
  }
  res.type("png").sendFile(p);
});

app.listen(env.PORT, () => {
  logger.info(`LinkedIn post agent running at ${env.PUBLIC_BASE_URL} (port ${env.PORT})`);
  logger.info(`Email: ${emailEnabled ? "on" : "OFF (drive from browser)"} · Images: ${imageEnabled ? "on" : "OFF"} · LinkedIn: ${linkedinEnabled ? "auto-post" : "copy-paste"}`);
});
