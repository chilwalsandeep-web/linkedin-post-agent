import { NextRequest, NextResponse } from "next/server";
import { linkedinOAuthConfigured } from "@/config/env";
import { failed, toErrorPage } from "@/lib/http";
import { buildAuthUrl } from "@/services/linkedinAuth";
import { newState } from "@/services/oauthState";

export const dynamic = "force-dynamic";

/** Kick off the LinkedIn consent flow. */
export async function GET(request: NextRequest) {
  try {
    if (!linkedinOAuthConfigured()) {
      return toErrorPage(
        request,
        "LinkedIn sign-in isn't configured yet. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET.",
      );
    }
    return NextResponse.redirect(buildAuthUrl(await newState()), 303);
  } catch (error) {
    return failed(request, error);
  }
}
