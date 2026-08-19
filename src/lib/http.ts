import { NextResponse } from "next/server";
import { logger } from "./logger";

/**
 * 303 redirect. Route handlers do the work (create a job, call Claude, publish)
 * and then hand off to a page, so a refresh never re-submits the form.
 */
export function seeOther(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

/** Send the browser to the friendly error page with a message. */
export function toErrorPage(request: Request, message: string): NextResponse {
  return seeOther(request, `/error?m=${encodeURIComponent(message)}`);
}

/** Log an unexpected failure and show it on the error page. */
export function failed(request: Request, error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Request failed:", message);
  return toErrorPage(request, message);
}
