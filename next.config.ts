import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Every route reads live KV / calls Claude, so there is nothing worth
  // pre-rendering — and Cloudflare serves the whole app from the Worker.
  poweredByHeader: false,
};

export default nextConfig;

// Makes the Cloudflare bindings (KV, vars, .dev.vars secrets) available to
// `next dev`, so local development hits the same code path as production.
// Only in dev: `next build` needs no bindings, and CI has no .dev.vars.
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}
