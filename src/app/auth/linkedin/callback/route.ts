import { NextRequest } from "next/server";
import { failed, seeOther, toErrorPage } from "@/lib/http";
import { logger } from "@/lib/logger";
import { saveConnection } from "@/services/connectionStore";
import { exchangeCode, fetchUserInfo, toConnection } from "@/services/linkedinAuth";
import { consumeState } from "@/services/oauthState";

export const dynamic = "force-dynamic";

/** LinkedIn redirects back here with ?code & ?state after the user clicks Allow. */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;

    const error = query.get("error");
    if (error) {
      return toErrorPage(request, `LinkedIn: ${query.get("error_description") ?? error}`);
    }
    if (!(await consumeState(query.get("state") ?? ""))) {
      return toErrorPage(request, "Your sign-in session expired. Please connect again.");
    }

    const token = await exchangeCode(query.get("code") ?? "");
    const info = await fetchUserInfo(token.access_token);
    await saveConnection(toConnection(token, info));
    logger.info(`LinkedIn connected: ${info.name} (${info.sub})`);

    return seeOther(request, "/account");
  } catch (err) {
    return failed(request, err);
  }
}
