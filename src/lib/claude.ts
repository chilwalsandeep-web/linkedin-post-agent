import { anthropic, firstText } from "./anthropic";
import { logger } from "./logger";

// The web-search server tool. Typed loosely so it compiles across SDK versions —
// the API executes it server-side; we just read the model's synthesized text.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WEB_SEARCH: any = { type: "web_search_20260209", name: "web_search", max_uses: 5 };

interface AskOpts {
  system: string;
  user: string;
  model: string;
  maxTokens: number;
  research?: boolean; // when true, let Claude search the web first
}

/**
 * Ask Claude, optionally with live web research. Handles the `pause_turn`
 * continuation that server-side tools can trigger, and gracefully degrades to a
 * no-tool call if web search is unavailable.
 */
export async function ask(opts: AskOpts): Promise<string> {
  const { system, user, model, maxTokens, research = true } = opts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req: any = {
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  };
  if (research) req.tools = [WEB_SEARCH];

  try {
    let resp = await anthropic().messages.create(req);
    let guard = 0;
    while (resp.stop_reason === "pause_turn" && guard < 4) {
      req.messages.push({ role: "assistant", content: resp.content });
      resp = await anthropic().messages.create(req);
      guard += 1;
    }
    return firstText(resp);
  } catch (err) {
    if (research) {
      logger.warn(`Web-search call failed, retrying without research: ${(err as Error).message}`);
      return ask({ ...opts, research: false });
    }
    throw err;
  }
}
