import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export const MODEL_ID_PATTERN = /^[0-9a-f-]+\.(glb|gltf)$/;

export function contentTypeFor(modelId: string) {
  return modelId.endsWith(".gltf") ? "model/gltf+json" : "model/gltf-binary";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ modelId: string }> },
) {
  const { modelId } = await params;

  if (!MODEL_ID_PATTERN.test(modelId)) {
    return new Response("Invalid model id", { status: 400 });
  }

  try {
    const modelPath = path.join(process.cwd(), ".generated-models", modelId);
    const file = await readFile(modelPath);

    return new Response(file, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": contentTypeFor(modelId),
      },
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Response("Model not found", { status: 404 });
    }

    return new Response("Failed to read model file", { status: 500 });
  }
}
