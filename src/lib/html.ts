import { env } from "../config/env";

/** Escape a string for interpolation into the hand-built email HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Absolute URL for links that leave the app (emails, OAuth). */
export function url(path: string): string {
  return `${env.PUBLIC_BASE_URL}${path}`;
}
