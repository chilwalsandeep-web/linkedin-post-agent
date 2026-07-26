import { ask } from "../lib/claude";
import { extractJson } from "../lib/json";
import { env } from "../config/env";
import { Tone } from "../types";

export interface HeadingsResult {
  brief: string;
  headings: string[];
}

/**
 * Research the topic on the web and propose 4 distinct LinkedIn post angles,
 * plus a short research brief that the writer step reuses.
 */
export async function generateHeadings(topic: string, tone: Tone): Promise<HeadingsResult> {
  const system =
    "You are a LinkedIn content strategist. You research topics on the web and turn them into distinct, compelling post angles for a professional audience.";

  const user = `Topic: "${topic}"
Desired tone: ${tone}

Research this topic (recent facts, trends, or debates), then propose 4 DISTINCT LinkedIn post angles.
Each heading should be a specific, scroll-stopping angle — not a generic title.

Respond in EXACTLY this format and nothing else:
BRIEF: <2-4 sentences capturing the key current facts/insights you found>
HEADINGS: <a JSON array of exactly 4 heading strings>`;

  const text = await ask({ system, user, model: env.RESEARCH_MODEL, maxTokens: 2500 });

  const briefMatch = text.match(/BRIEF:\s*([\s\S]*?)\n\s*HEADINGS:/i);
  const brief = briefMatch ? briefMatch[1].trim() : "";

  let headings: string[] = [];
  try {
    const parsed = extractJson<string[]>(text);
    if (Array.isArray(parsed)) headings = parsed.map(String);
  } catch {
    // Fallback: parse lines after "HEADINGS:"
    const tail = text.split(/HEADINGS:/i)[1] ?? "";
    headings = tail
      .split("\n")
      .map((l) => l.replace(/^[\s\-\d.)"'*]+/, "").replace(/["']$/, "").trim())
      .filter(Boolean);
  }

  return { brief, headings: headings.slice(0, 4) };
}
