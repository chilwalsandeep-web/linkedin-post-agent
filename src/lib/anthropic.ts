import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";

// Lazily constructed so it reads ANTHROPIC_API_KEY only after the Worker
// bindings have been captured (initRuntime), not at module-load time.
let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

/** Concatenate all text blocks from a Messages API response. */
export function firstText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}
