export const TONES = [
  "Professional",
  "Conversational",
  "Descriptive",
  "Storytelling",
  "Bold / Opinionated",
  "Educational",
] as const;
export type Tone = (typeof TONES)[number];

export const PLATFORMS = ["LinkedIn"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type JobStatus =
  | "headings" // headings generated, awaiting selection
  | "writing" // drafting the post
  | "review" // draft ready, awaiting approval / changes
  | "approved" // approved (copy-paste mode)
  | "posted" // posted to LinkedIn
  | "error";

export interface Job {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;

  // form input
  topic: string;
  tone: Tone;
  platform: Platform;

  // research + headings
  brief: string;
  headings: string[];
  selectedHeading: string | null;

  // draft
  withImage: boolean | null;
  draft: string | null;
  hasImage: boolean;
  revisionNotes: string[];

  // outcome
  postedToLinkedIn: boolean;
  error?: string;
}
