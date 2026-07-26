import { ask } from "../lib/claude";
import { env } from "../config/env";
import { Job } from "../types";

/**
 * Write (or re-write) the LinkedIn post for the selected heading, in the chosen
 * tone. The goal is plain, simple, human-sounding, ORIGINAL text — not polished
 * "AI writing". A separate reviewer agent (reviewer.service) then double-checks
 * and simplifies it further. If the job has revision notes, apply them.
 */
export async function writePost(job: Job): Promise<string> {
  const system = `You write a ${job.platform} post that sounds like a real person typed it — a normal professional, not a marketing team.

WRITE LIKE A HUMAN, SIMPLY:
- Use plain, everyday words. Short sentences. Aim for a grade 6-8 reading level.
- Vary sentence length so it has a natural rhythm. Contractions are good (it's, you're, don't).
- One clear idea. A real point of view or small story. Say something you actually believe.
- Keep it short: roughly 100-180 words.
- End with 3-4 simple, relevant hashtags on their own line. Each hashtag is a single word with no spaces (e.g. #ProductManagement, #FutureOfWork).

ORIGINALITY (no plagiarism):
- Use the facts from the brief, but say them in your OWN plain words. Never copy phrasing, sentences, or distinctive wording from any source. Paraphrase everything.

BANNED — these make it read like AI. Do NOT use:
- Clichés: "in today's fast-paced world", "let's dive in", "game-changer", "unlock", "leverage", "navigate the landscape", "the future of", "at the end of the day", "needle-mover".
- The formulas: "It's not X, it's Y." / "The real question isn't... it's..." / "Here's the thing:" / rule-of-three lists everywhere / a rhetorical question as the opener AND closer.
- Fake hype, emoji spam, and buzzword stacking.

Return ONLY the final post text — no preamble, no quotes, no notes.`;

  const revisionBlock =
    job.revisionNotes.length > 0
      ? `\n\nThe user reviewed an earlier draft and asked for these changes — apply them:\n- ${job.revisionNotes.join("\n- ")}`
      : "";

  const user = `Angle / heading: "${job.selectedHeading}"
Topic: "${job.topic}"
Tone: ${job.tone}

Research brief (facts to use, in your own words):
${job.brief || "(no brief — keep it general and honest)"}

Write the post now, simple and human.${revisionBlock}`;

  return ask({ system, user, model: env.WRITER_MODEL, maxTokens: 1200, research: false });
}

/** Build an image-generation prompt from the post angle. */
export function buildImagePrompt(job: Job): string {
  return `A clean, modern, professional illustration for a LinkedIn post titled "${
    job.selectedHeading ?? job.topic
  }". Business-appropriate, visually striking, minimal. Do NOT include any text, words, letters, or logos in the image.`;
}
