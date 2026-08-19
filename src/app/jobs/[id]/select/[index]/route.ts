import { NextRequest } from "next/server";
import { failed, seeOther, toErrorPage } from "@/lib/http";
import { loadJob, saveJob } from "@/services/jobStore";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string; index: string }>;
}

/** Pick one of the four angles (this is the link inside the headings email). */
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { id, index } = await params;
    const job = await loadJob(id);
    if (!job) return toErrorPage(request, "That job no longer exists. Start over.");

    const position = Number(index);
    if (!Number.isInteger(position) || position < 0 || position >= job.headings.length) {
      return toErrorPage(request, "Invalid angle selection.");
    }

    job.selectedHeading = job.headings[position];
    await saveJob(job);
    return seeOther(request, `/jobs/${job.id}`);
  } catch (error) {
    return failed(request, error);
  }
}
