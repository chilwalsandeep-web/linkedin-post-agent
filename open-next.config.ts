import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override: every route in this app is `force-dynamic`
// (KV reads + live Claude calls), so there is no ISR output to cache and no R2
// bucket or queue to provision.
export default defineCloudflareConfig();
