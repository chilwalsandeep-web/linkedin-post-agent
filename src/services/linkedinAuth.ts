import { env } from "../config/env";
import { logger } from "../lib/logger";
import { LinkedInConnection, getConnection, saveConnection } from "./connectionStore";

// 3-legged OAuth for "Sign in with LinkedIn" + "Share on LinkedIn".
// You (the app owner) hold ONE client id/secret. Each user just clicks
// "Connect LinkedIn" and approves — they never create an app or see a secret.
const SCOPES = "openid profile email w_member_social";
const AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
}

export interface UserInfo {
  sub: string;
  name: string;
  email?: string;
}

/** Build the LinkedIn consent URL the user is redirected to. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.LINKEDIN_CLIENT_ID ?? "",
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    state,
    scope: SCOPES,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function postToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    throw new Error(`LinkedIn token endpoint ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Exchange the authorization code (from the callback) for tokens. */
export function exchangeCode(code: string): Promise<TokenResponse> {
  return postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.LINKEDIN_REDIRECT_URI,
    client_id: env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: env.LINKEDIN_CLIENT_SECRET ?? "",
  });
}

function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return postToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: env.LINKEDIN_CLIENT_SECRET ?? "",
  });
}

/** Fetch the connected member's identity (sub -> author urn, name, email). */
export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`LinkedIn userinfo ${res.status}`);
  return (await res.json()) as UserInfo;
}

/** Build a stored connection from a fresh token + identity. */
export function toConnection(token: TokenResponse, info: UserInfo): LinkedInConnection {
  return {
    sub: info.sub,
    name: info.name,
    email: info.email,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    refreshTokenExpiresAt: token.refresh_token_expires_in
      ? Date.now() + token.refresh_token_expires_in * 1000
      : undefined,
    connectedAt: new Date().toISOString(),
  };
}

/**
 * Return the current connection with a valid access token, refreshing it if it's
 * expired and a refresh token is available. Returns null if there's no usable
 * connection (not connected, or expired with no refresh token -> reconnect).
 */
export async function getValidConnection(): Promise<LinkedInConnection | null> {
  const conn = await getConnection();
  if (!conn) return null;
  if (Date.now() < conn.expiresAt - 60_000) return conn; // still valid (60s buffer)

  if (!conn.refreshToken) {
    logger.warn("LinkedIn access token expired and no refresh token — user must reconnect.");
    return null;
  }
  try {
    const token = await refreshAccessToken(conn.refreshToken);
    const updated = toConnection(token, { sub: conn.sub, name: conn.name, email: conn.email });
    if (!updated.refreshToken) updated.refreshToken = conn.refreshToken; // keep old if none returned
    await saveConnection(updated);
    logger.info("Refreshed LinkedIn access token.");
    return updated;
  } catch (err) {
    logger.warn(`LinkedIn token refresh failed: ${(err as Error).message}`);
    return null;
  }
}
