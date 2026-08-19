import { kv } from "../config/env";
import { Job, Platform, Tone } from "../types";

// KV-backed storage (Workers have no filesystem). Jobs are JSON under
// `job:<id>`; a generated image is stored as raw bytes under `job:<id>:image`.

const jobKey = (id: string): string => `job:${id}`;
const imageKey = (id: string): string => `job:${id}:image`;

export function createJob(input: { topic: string; tone: Tone; platform: Platform }): Promise<Job> {
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
  return saveJob(job);
}

export async function loadJob(id: string): Promise<Job | null> {
  return (await kv().get<Job>(jobKey(id), "json")) ?? null;
}

export async function saveJob(job: Job): Promise<Job> {
  job.updatedAt = new Date().toISOString();
  await kv().put(jobKey(job.id), JSON.stringify(job));
  return job;
}

export async function saveImage(id: string, bytes: ArrayBuffer): Promise<void> {
  await kv().put(imageKey(id), bytes);
}

export async function loadImage(id: string): Promise<ArrayBuffer | null> {
  return (await kv().get(imageKey(id), "arrayBuffer")) ?? null;
}

export async function hasImageFile(id: string): Promise<boolean> {
  return (await loadImage(id)) !== null;
}
