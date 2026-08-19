import { NextRequest } from "next/server";
import { failed, seeOther } from "@/lib/http";
import { clearConnection } from "@/services/connectionStore";

export const dynamic = "force-dynamic";

/** Forget the stored LinkedIn tokens. */
export async function POST(request: NextRequest) {
  try {
    await clearConnection();
    return seeOther(request, "/account");
  } catch (error) {
    return failed(request, error);
  }
}
