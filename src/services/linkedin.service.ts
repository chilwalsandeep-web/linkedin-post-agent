import fs from "fs";
import { env, linkedinEnabled } from "../config/env";
import { logger } from "../lib/logger";

export interface PostResult {
  posted: boolean; // true = pushed to LinkedIn, false = copy-paste mode
  message: string;
}

const LI_BASE = "https://api.linkedin.com";
const HEADERS = () => ({
  Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
  "X-Restli-Protocol-Version": "2.0.0",
});

/**
 * Publish text (and optionally an image) to LinkedIn.
 *
 * Runs only when LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN are set. Until your
 * LinkedIn app + `w_member_social` scope is approved, leave them blank — this
 * returns copy-paste mode and the caller emails you the finished post instead.
 */
export async function publishPost(text: string, imageFile?: string | null): Promise<PostResult> {
  if (!linkedinEnabled) {
    return { posted: false, message: "LinkedIn not configured — copy-paste mode." };
  }

  const author = env.LINKEDIN_AUTHOR_URN as string;

  let assetUrn: string | null = null;
  if (imageFile && fs.existsSync(imageFile)) {
    try {
      assetUrn = await uploadImage(author, imageFile);
    } catch (err) {
      logger.warn(`Image upload to LinkedIn failed, posting text only: ${(err as Error).message}`);
    }
  }

  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: assetUrn ? "IMAGE" : "NONE",
        ...(assetUrn
          ? { media: [{ status: "READY", media: assetUrn }] }
          : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(`${LI_BASE}/v2/ugcPosts`, {
    method: "POST",
    headers: HEADERS(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    logger.error(`LinkedIn post failed (${res.status}): ${detail}`);
    throw new Error(`LinkedIn API error ${res.status}: ${detail}`);
  }

  return { posted: true, message: "Posted to LinkedIn." };
}

/** Register + upload an image, returning its asset URN. */
async function uploadImage(author: string, imageFile: string): Promise<string> {
  const registerRes = await fetch(`${LI_BASE}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: HEADERS(),
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: author,
        serviceRelationships: [
          { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
        ],
      },
    }),
  });
  if (!registerRes.ok) throw new Error(`registerUpload ${registerRes.status}`);

  const reg = (await registerRes.json()) as {
    value: {
      asset: string;
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: string };
      };
    };
  };
  const uploadUrl =
    reg.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;

  const bytes = fs.readFileSync(imageFile);
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${env.LINKEDIN_ACCESS_TOKEN}` },
    body: bytes,
  });
  if (!putRes.ok) throw new Error(`binary upload ${putRes.status}`);

  return reg.value.asset;
}
