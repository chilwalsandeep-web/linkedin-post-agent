import { env, imageEnabled } from "../config/env";
import { saveImage } from "./jobStore";
import { logger } from "../lib/logger";

/**
 * Generate an image for a job via OpenAI (gpt-image-1) and store it in KV under
 * the job id. Returns true on success. No-op if images are disabled.
 */
export async function generateImage(jobId: string, prompt: string): Promise<boolean> {
  if (!imageEnabled()) {
    logger.warn("Image requested but image generation is disabled (set IMAGE_PROVIDER=openai + OPENAI_API_KEY).");
    return false;
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: env.IMAGE_SIZE,
      n: 1,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    logger.error(`Image generation failed (${res.status}): ${detail}`);
    throw new Error(`OpenAI image error ${res.status}`);
  }

  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI image response had no image data.");

  await saveImage(jobId, base64ToArrayBuffer(b64));
  logger.info(`Image saved for job ${jobId}.`);
  return true;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
