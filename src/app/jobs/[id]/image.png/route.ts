import { loadImage } from "@/services/jobStore";

export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ id: string }>;
}

/** Serve a job's generated image straight from KV. */
export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const bytes = await loadImage(id);
  if (!bytes) return new Response(null, { status: 404 });

  return new Response(bytes, {
    headers: {
      "content-type": "image/png",
      // Immutable: a job's image is generated once and never rewritten.
      "cache-control": "private, max-age=3600, immutable",
    },
  });
}
