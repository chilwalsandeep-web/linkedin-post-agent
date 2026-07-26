import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  RESEARCH_MODEL: z.string().default("claude-sonnet-5"),
  WRITER_MODEL: z.string().default("claude-sonnet-5"),

  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),

  GMAIL_USER: z.string().optional(),
  GMAIL_APP_PASSWORD: z.string().optional(),
  EMAIL_TO: z.string().optional(),

  IMAGE_PROVIDER: z.enum(["openai", "none"]).default("openai"),
  OPENAI_API_KEY: z.string().optional(),
  IMAGE_SIZE: z.string().default("1024x1024"),

  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_AUTHOR_URN: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

/** Recipient for all agent emails. */
export const emailTo = env.EMAIL_TO || env.GMAIL_USER || "";

export const emailEnabled = Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
export const imageEnabled = Boolean(env.IMAGE_PROVIDER === "openai" && env.OPENAI_API_KEY);
export const linkedinEnabled = Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_AUTHOR_URN);
