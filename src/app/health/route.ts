export const dynamic = "force-dynamic";

/** Liveness probe. Deliberately does not touch KV or any API key. */
export function GET() {
  return Response.json({ ok: true });
}
