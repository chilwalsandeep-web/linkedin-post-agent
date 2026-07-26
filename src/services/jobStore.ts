import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Job, Platform, Tone } from "../types";

const JOBS_DIR = path.join(process.cwd(), "data", "jobs");

function ensureDir(): void {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function jobPath(id: string): string {
  return path.join(JOBS_DIR, `${id}.json`);
}

export function imagePath(id: string): string {
  return path.join(JOBS_DIR, `${id}.png`);
}

export function hasImageFile(id: string): boolean {
  return fs.existsSync(imagePath(id));
}

export function createJob(input: { topic: string; tone: Tone; platform: Platform }): Job {
  ensureDir();
  const now = new Date().toISOString();
  const job: Job = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "headings",
    topic: input.topic,
    tone: input.tone,
    platform: input.platform,
    brief: "",
    headings: [],
    selectedHeading: null,
    withImage: null,
    draft: null,
    hasImage: false,
    revisionNotes: [],
    postedToLinkedIn: false,
  };
  saveJob(job);
  return job;
}

export function loadJob(id: string): Job | null {
  try {
    return JSON.parse(fs.readFileSync(jobPath(id), "utf-8")) as Job;
  } catch {
    return null;
  }
}

export function saveJob(job: Job): Job {
  ensureDir();
  job.updatedAt = new Date().toISOString();
  fs.writeFileSync(jobPath(job.id), JSON.stringify(job, null, 2), "utf-8");
  return job;
}
