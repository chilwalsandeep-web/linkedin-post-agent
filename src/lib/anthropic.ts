import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

// Single shared client. Reads ANTHROPIC_API_KEY from env (set explicitly here
// so a missing key fails fast with our own validation message).
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

/** Concatenate all text blocks from a Messages API response. */
export function firstText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
