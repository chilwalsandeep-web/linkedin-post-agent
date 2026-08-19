import { NextRequest } from "next/server";
import { failed, seeOther, toErrorPage } from "@/lib/http";
import { logger } from "@/lib/logger";
import { sendDraftEmail } from "@/services/email.service";
import { loadJob, saveJob } from "@/services/jobStore";
import { humanize } from "@/services/reviewer.service";
import { writePost } from "@/services/writer.service";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

/** Suggest changes -> regenerate the draft with those notes applied. */
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const job = await loadJob(id);
    if (!job) return toErrorPage(request, "That job no longer exists. Start over.");

    const form = await request.formData();
    const notes = String(form.get("notes") ?? "").trim();
    if (!notes) return toErrorPage(request, "Please describe the changes you want.");

    job.revisionNotes.push(notes);
    job.status = "writing";
    await saveJob(job);

    job.draft = await writePost(job);
    const reviewed = await humanize(job, job.draft);
    job.draft = reviewed.text;
    job.reviewNote = reviewed.note;
    job.status = "review";
    await saveJob(job);

    await sendDraftEmail(job).catch((e) => logger.warn("Draft email failed:", (e as Error).message));
    return seeOther(request, `/jobs/${job.id}`);
  } catch (error) {
    return failed(request, error);
  }
}
