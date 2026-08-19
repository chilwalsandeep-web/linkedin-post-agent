import fs from "fs";
import { env, linkedinEnabled } from "../config/env";
import { logger } from "../lib/logger";
import { getValidConnection } from "./linkedinAuth";

export interface PostResult {
  posted: boolean; // true = pushed to LinkedIn, false = copy-paste mode
  message: string;
}

const LI_BASE = "https://api.linkedin.com";

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

/**
 * Resolve which token + author to post as:
 *  1. an OAuth-connected account (preferred; auto-refreshed), else
 *  2. a static token from .env (legacy fallback), else
 *  3. nothing -> copy-paste mode.
 */
async function resolvePoster(): Promise<{ token: string; author: string } | null> {
  const conn = await getValidConnection();
  if (conn) return { token: conn.accessToken, author: `urn:li:person:${conn.sub}` };
  if (linkedinEnabled && env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_AUTHOR_URN) {
    return { token: env.LINKEDIN_ACCESS_TOKEN, author: env.LINKEDIN_AUTHOR_URN };
  }
  return null;
}

/**
 * Publish text (and optionally an image) to the connected member's own feed.
 * Returns copy-paste mode if no account is connected/configured.
 */
export async function publishPost(text: string, imageFile?: string | null): Promise<PostResult> {
  const poster = await resolvePoster();
  if (!poster) {
    return { posted: false, message: "No LinkedIn account connected — copy-paste mode." };
  }
  const { token, author } = poster;

  let assetUrn: string | null = null;
  if (imageFile && fs.existsSync(imageFile)) {
    try {
      assetUrn = await uploadImage(token, author, imageFile);
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
        ...(assetUrn ? { media: [{ status: "READY", media: assetUrn }] } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res = await fetch(`${LI_BASE}/v2/ugcPosts`, {
    method: "POST",
    headers: headers(token),
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
async function uploadImage(token: string, author: string, imageFile: string): Promise<string> {
  const registerRes = await fetch(`${LI_BASE}/v2/assets?action=registerUpload`, {
    method: "POST",
    headers: headers(token),
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
    headers: { Authorization: `Bearer ${token}` },
    body: bytes,
  });
  if (!putRes.ok) throw new Error(`binary upload ${putRes.status}`);

  return reg.value.asset;
}
