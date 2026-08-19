import { kv } from "../config/env";

// Short-lived OAuth CSRF state. Worker isolates are ephemeral and requests can
// land on different ones, so the nonce lives in KV rather than in memory.

const TTL_SECONDS = 600;
const key = (state: string): string => `oauthstate:${state}`;

/** Mint a one-time state nonce for the LinkedIn consent redirect. */
export async function newState(): Promise<string> {
  const state = crypto.randomUUID();
  await kv().put(key(state), "1", { expirationTtl: TTL_SECONDS });
  return state;
}

/** Verify and burn a state nonce. False if it is unknown or already used. */
export async function consumeState(state: string): Promise<boolean> {
  if (!state) return false;
  const hit = await kv().get(key(state));
  if (!hit) return false;
  await kv().delete(key(state));
  return true;
}
