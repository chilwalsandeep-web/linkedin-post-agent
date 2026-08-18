import fs from "fs";
import path from "path";

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
interface Store {
  current: LinkedInConnection | null;
}

const FILE = path.join(process.cwd(), "data", "connections.json");

function read(): Store {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf-8")) as Store;
  } catch {
    return { current: null };
  }
}

function write(store: Store): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function getConnection(): LinkedInConnection | null {
  return read().current;
}

export function saveConnection(conn: LinkedInConnection): void {
  write({ current: conn });
}

export function clearConnection(): void {
  write({ current: null });
}
