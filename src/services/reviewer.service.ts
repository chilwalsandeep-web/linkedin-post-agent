import { ask } from "../lib/claude";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { Job } from "../types";

const PASS_BAR = 8; // both scores must reach this to accept without a rewrite
const MAX_ROUNDS = 2; // max rewrite attempts

interface Scores {
  human: number | null;
  simple: number | null;
  issues: string;
}

/** Score-only pass. Returns a single-line JSON verdict (safe to parse). */
async function score(text: string): Promise<Scores> {
  const system = `You rate a LinkedIn post on two things, then STOP. Do not rewrite.
- human (1-10): does it sound like a real person typed it, in a natural voice? Calibration: 8-10 = clearly human and natural; 5-7 = some AI tells (clichés, the "not X, it's Y" formula, buzzwords, report-like stat dumps, over-polished lines); 1-4 = obviously robotic.
- simple (1-10): plain everyday words, short sentences, grade 6-8 reading level.

Output ONE line only, nothing else:
SCORES: {"human_score": <int>, "simple_score": <int>, "issues": "<one short line, no line breaks>"}`;

  const out = await ask({ system, user: `Post:\n"""\n${text}\n"""`, model: env.WRITER_MODEL, maxTokens: 300, research: false });
  const m = out.match(/\{.*\}/);
  if (m) {
    try {
      const s = JSON.parse(m[0]) as { human_score?: number; simple_score?: number; issues?: string };
      return {
        human: Number.isFinite(Number(s.human_score)) ? Number(s.human_score) : null,
        simple: Number.isFinite(Number(s.simple_score)) ? Number(s.simple_score) : null,
        issues: String(s.issues ?? ""),
      };
    } catch {
      /* fall through */
    }
  }
  return { human: null, simple: null, issues: "" };
}

/** Rewrite-only pass. Returns plain post text (no JSON, no markers). */
async function rewrite(job: Job, text: string, issues: string): Promise<string> {
  const system = `You rewrite a LinkedIn post to sound like a real person wrote it, in plain simple English, with ORIGINAL wording (nothing copied). Keep the core message and facts, keep the ${job.tone} tone, keep ~100-180 words and 3-4 single-word hashtags.
Avoid clichés, the "it's not X, it's Y" formula, rhetorical-question bookends, buzzwords, and report-style stat dumps.
Return ONLY the rewritten post text — no preamble, no quotes, no notes.`;

  const fix = issues ? `\n\nFix these specifically: ${issues}` : "";
  return ask({ system, user: `Rewrite this post:\n"""\n${text}\n"""${fix}`, model: env.WRITER_MODEL, maxTokens: 1200, research: false });
}

/**
 * Reviewer agent. Scores the draft; if it isn't human/simple enough, rewrites and
 * re-scores, up to MAX_ROUNDS. The returned verdict always matches the final text.
 * A good draft passes on the first score with no rewrite (cheap).
 */
export async function humanize(job: Job, draft: string): Promise<{ text: string; note: string }> {
  let current = draft;
  let s = await score(current);
  logger.info(`Reviewer score: human=${s.human ?? "?"} simple=${s.simple ?? "?"}`);

  let rounds = 0;
  // If scoring failed to parse (nulls), treat as pass to keep the good draft.
  const failing = (x: Scores) => x.human != null && x.simple != null && Math.min(x.human, x.simple) < PASS_BAR;

  while (failing(s) && rounds < MAX_ROUNDS) {
    const rw = (await rewrite(job, current, s.issues)).trim();
    if (!rw) break;
    current = rw;
    s = await score(current);
    rounds += 1;
    logger.info(`Reviewer after rewrite ${rounds}: human=${s.human ?? "?"} simple=${s.simple ?? "?"}`);
  }

  let note: string;
  if (s.human == null || s.simple == null) {
    note = "reviewed & simplified";
  } else {
    const passed = Math.min(s.human, s.simple) >= PASS_BAR;
    note = `${passed ? "✓ reads human & simple" : "simplified"} (human ${s.human}/10 · simple ${s.simple}/10)`;
  }
  return { text: current, note };
}
