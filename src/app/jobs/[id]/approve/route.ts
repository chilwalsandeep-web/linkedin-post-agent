import { NextRequest } from "next/server";
import { failed, seeOther, toErrorPage } from "@/lib/http";
import { logger } from "@/lib/logger";
import { sendApprovedEmail } from "@/services/email.service";
import { hasImageFile, loadImage, loadJob, saveJob } from "@/services/jobStore";
import { publishPost } from "@/services/linkedin.service";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

/** Approve -> publish to the connected feed, or fall back to copy-paste mode. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const job = await loadJob(id);
    if (!job || !job.draft) return toErrorPage(request, "Nothing to approve yet.");

    const imageBytes = (await hasImageFile(job.id)) ? await loadImage(job.id) : null;
    const result = await publishPost(job.draft, imageBytes);
    job.postedToLinkedIn = result.posted;
    job.status = result.posted ? "posted" : "approved";
    await saveJob(job);

    await sendApprovedEmail(job, result.posted).catch((e) =>
      logger.warn("Approved email failed:", (e as Error).message),
    );
    return seeOther(request, `/jobs/${job.id}`);
  } catch (error) {
    return failed(request, error);
  }
}
