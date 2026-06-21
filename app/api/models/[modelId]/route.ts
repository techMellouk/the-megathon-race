import {
  contentTypeForExtension,
  decodeModelId,
  modelExtension,
} from "@/lib/model-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const { modelId } = await params;
  const sourceUrl = decodeModelId(modelId);

  if (!sourceUrl) {
    return new Response("Invalid model id", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(sourceUrl);
  } catch {
    return new Response("Failed to reach model source", { status: 502 });
  }

  if (upstream.status === 404) {
    return new Response("Model not found", { status: 404 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Failed to fetch model", { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Cache-Control": "public, max-age=3600, immutable",
      "Content-Type": contentTypeForExtension(modelExtension(modelId)),
    },
  });
}
