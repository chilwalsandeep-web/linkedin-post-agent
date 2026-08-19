import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

// On Cloudflare Workers there is no `process.env` at module load — bindings
// (vars, secrets, KV) arrive per request. Under Next.js + OpenNext we read them
// through `getCloudflareContext()`, validate once per isolate, and re-expose the
// result as a plain `env` object so the rest of the app keeps its old ergonomics.

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  RESEARCH_MODEL: z.string().default("claude-sonnet-5"),
  WRITER_MODEL: z.string().default("claude-sonnet-5"),

  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),

  // Email via Resend (HTTP API — Workers can't do SMTP/nodemailer).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(), // e.g. "LinkedIn Agent <agent@yourdomain.com>"
  EMAIL_TO: z.string().optional(),

  IMAGE_PROVIDER: z.enum(["openai", "none"]).default("none"),
  OPENAI_API_KEY: z.string().optional(),
  IMAGE_SIZE: z.string().default("1024x1024"),

  // OAuth "Connect LinkedIn" (one app you own; users just click Allow)
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().url().default("http://localhost:3000/auth/linkedin/callback"),

  // Legacy static token fallback (your own hand-pasted token)
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_AUTHOR_URN: z.string().optional(),
});

export type AppEnv = z.infer<typeof schema>;

/** Worker bindings: the validated vars plus the KV namespace. */
export interface WorkerBindings extends Record<string, unknown> {
  KV: KVNamespace;
}

// Validation is memoised against the bindings object itself, so a new isolate
// (or a swapped-in binding set during local dev) re-validates automatically.
let cachedSource: WorkerBindings | null = null;
let cachedEnv: AppEnv | null = null;

function bindings(): WorkerBindings {
  return getCloudflareContext().env as unknown as WorkerBindings;
}

/** The validated environment for the current request. Throws if misconfigured. */
export function getEnv(): AppEnv {
  const source = bindings();
  if (cachedEnv && cachedSource === source) return cachedEnv;

  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${detail}`);
  }
  cachedSource = source;
  cachedEnv = parsed.data;
  return cachedEnv;
}

/**
 * `env.ANTHROPIC_API_KEY`-style access, resolved lazily per request. Keeping this
 * shape means the service layer (Claude, LinkedIn, email) is unchanged from the
 * Express/Hono versions — only the source of the values moved.
 */
export const env: AppEnv = new Proxy({} as AppEnv, {
  get: (_target, prop) => getEnv()[prop as keyof AppEnv],
  has: (_target, prop) => prop in getEnv(),
  ownKeys: () => Reflect.ownKeys(getEnv()),
  getOwnPropertyDescriptor: (_target, prop) => {
    const descriptor = Object.getOwnPropertyDescriptor(getEnv(), prop);
    return descriptor ? { ...descriptor, configurable: true } : undefined;
  },
});

/** The KV namespace bound as `KV` in wrangler config. */
export function kv(): KVNamespace {
  const binding = bindings().KV;
  if (!binding) throw new Error("KV namespace is not bound (check wrangler.jsonc).");
  return binding;
}

/** Recipient for all agent emails. */
export const emailTo = (): string => env.EMAIL_TO || "";

export const emailEnabled = (): boolean => Boolean(env.RESEND_API_KEY && env.EMAIL_FROM && emailTo());
export const imageEnabled = (): boolean => Boolean(env.IMAGE_PROVIDER === "openai" && env.OPENAI_API_KEY);
export const linkedinEnabled = (): boolean => Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_AUTHOR_URN);
export const linkedinOAuthConfigured = (): boolean => Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET);
