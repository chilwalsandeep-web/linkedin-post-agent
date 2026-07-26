import { ask } from "../lib/claude";
import { env } from "../config/env";
import { Job } from "../types";

/**
 * Write (or re-write) the full LinkedIn post for the selected heading, in the
 * chosen tone. If the job carries revision notes, the latest draft is revised
 * to honor them.
 */
export async function writePost(job: Job): Promise<string> {
  const system = `You write high-quality ${job.platform} posts in a specific tone. Tone: ${job.tone}.

Rules:
- Open with a strong hook. Share a genuine point of view, not a dry summary.
- Keep it tight — roughly 120-220 words, short paragraphs, easy to skim.
- End with 3-5 relevant hashtags on their own line.
- No emoji spam, no "I'm thrilled to announce", no generic AI clichés.
- Ground claims in the research brief; do not invent statistics.
Return ONLY the final post text — no preamble, no quotes, no explanation.`;

  const revisionBlock =
    job.revisionNotes.length > 0
      ? `\n\nThe user reviewed a previous draft and asked for these changes (apply them faithfully):\n- ${job.revisionNotes.join("\n- ")}`
      : "";

  const user = `Chosen angle / heading: "${job.selectedHeading}"
Original topic: "${job.topic}"

Research brief:
${job.brief || "(no brief — research the angle yourself)"}

Do any quick additional research needed, then write the post.${revisionBlock}`;

  return ask({ system, user, model: env.WRITER_MODEL, maxTokens: 1500 });
}

/** Build an image-generation prompt from the post angle. */
export function buildImagePrompt(job: Job): string {
  return `A clean, modern, professional illustration for a LinkedIn post titled "${
    job.selectedHeading ?? job.topic
  }". Business-appropriate, visually striking, minimal. Do NOT include any text, words, letters, or logos in the image.`;
}
