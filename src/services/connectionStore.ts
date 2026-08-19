import { kv } from "../config/env";

/** A LinkedIn account connected via OAuth (holds the member's tokens). */
export interface LinkedInConnection {
  sub: string; // LinkedIn member id -> author urn is urn:li:person:<sub>
  name: string;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  refreshTokenExpiresAt?: number;
  connectedAt: string;
}

// Single-connection store for now (one user). Multi-tenant later keys by userId.
const KEY = "connection:current";

export async function getConnection(): Promise<LinkedInConnection | null> {
  return (await kv().get<LinkedInConnection>(KEY, "json")) ?? null;
}

export async function saveConnection(conn: LinkedInConnection): Promise<void> {
  await kv().put(KEY, JSON.stringify(conn));
}

export async function clearConnection(): Promise<void> {
  await kv().delete(KEY);
}
