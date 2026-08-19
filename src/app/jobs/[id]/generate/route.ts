import { NextRequest } from "next/server";
import { imageEnabled } from "@/config/env";
import { failed, seeOther, toErrorPage } from "@/lib/http";
import { logger } from "@/lib/logger";
import { sendDraftEmail } from "@/services/email.service";
import { generateImage } from "@/services/image.service";
import { loadJob, saveJob } from "@/services/jobStore";
import { humanize } from "@/services/reviewer.service";
import { buildImagePrompt, writePost } from "@/services/writer.service";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

/** Write the post for the chosen angle (+ optional image), then email the draft. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const job = await loadJob(id);
    if (!job) return toErrorPage(request, "That job no longer exists. Start over.");
    if (!job.selectedHeading) return toErrorPage(request, "Pick an angle first.");

    const form = await request.formData();
    job.withImage = String(form.get("image")) === "yes";
    job.status = "writing";
    await saveJob(job);

    job.draft = await writePost(job);
    const reviewed = await humanize(job, job.draft);
    job.draft = reviewed.text;
    job.reviewNote = reviewed.note;

    if (job.withImage && imageEnabled()) {
      try {
        job.hasImage = await generateImage(job.id, buildImagePrompt(job));
      } catch (e) {
        logger.warn("Image generation failed, continuing text-only:", (e as Error).message);
        job.hasImage = false;
      }
    }

    job.status = "review";
    await saveJob(job);

    await sendDraftEmail(job).catch((e) => logger.warn("Draft email failed:", (e as Error).message));
    return seeOther(request, `/jobs/${job.id}`);
  } catch (error) {
    return failed(request, error);
  }
}
