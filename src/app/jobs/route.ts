import { NextRequest } from "next/server";
import { failed, seeOther, toErrorPage } from "@/lib/http";
import { logger } from "@/lib/logger";
import { sendHeadingsEmail } from "@/services/email.service";
import { createJob, saveJob } from "@/services/jobStore";
import { generateHeadings } from "@/services/research.service";
import { PLATFORMS, Platform, TONES, Tone } from "@/types";

export const dynamic = "force-dynamic";

/** Submit the form -> research the topic -> 4 angles -> email them. */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const topic = String(form.get("topic") ?? "").trim();
    const rawTone = String(form.get("tone") ?? "");
    const rawPlatform = String(form.get("platform") ?? "");
    const tone = (TONES.includes(rawTone as Tone) ? rawTone : TONES[0]) as Tone;
    const platform = (PLATFORMS.includes(rawPlatform as Platform) ? rawPlatform : "LinkedIn") as Platform;

    if (!topic) return seeOther(request, `/?error=${encodeURIComponent("Please enter a topic.")}`);

    const job = await createJob({ topic, tone, platform });
    logger.info(`Job ${job.id} created: "${topic}" (${tone})`);

    const { brief, headings } = await generateHeadings(topic, tone);
    job.brief = brief;
    job.headings = headings;
    await saveJob(job);

    if (headings.length === 0) {
      return toErrorPage(request, "Couldn't generate angles — try a more specific topic.");
    }

    await sendHeadingsEmail(job).catch((e) => logger.warn("Headings email failed:", (e as Error).message));
    return seeOther(request, `/jobs/${job.id}`);
  } catch (error) {
    return failed(request, error);
  }
}
