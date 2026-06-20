import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "wavespeed";

export const runtime = "nodejs";

const MODEL = "wavespeed-ai/meshy6/text-to-3d";
const MAX_PROMPT_LENGTH = 600;

type GenerationBody = {
  prompt?: unknown;
};

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown generation error.";
}

function extractOutputUrl(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (!output || typeof output !== "object") {
    return null;
  }

  const record = output as Record<string, unknown>;
  for (const key of ["url", "download_url", "model_url", "file"]) {
    if (typeof record[key] === "string") {
      return record[key] as string;
    }
  }

  return null;
}

function extensionFor(url: string, contentType: string | null) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (ext === ".glb" || ext === ".gltf") {
      return ext;
    }
  } catch {
    // Fall back to content type below.
  }

  if (contentType?.includes("model/gltf+json")) {
    return ".gltf";
  }

  return ".glb";
}

async function cacheModel(outputUrl: string) {
  const response = await fetch(outputUrl);

  if (!response.ok) {
    throw new Error(`Could not download WaveSpeed output: ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  const extension = extensionFor(outputUrl, contentType);
  const filename = `${randomUUID()}${extension}`;
  const outputDir = path.join(process.cwd(), ".generated-models");
  const outputPath = path.join(outputDir, filename);
  const buffer = Buffer.from(await response.arrayBuffer());

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, buffer);

  return `/api/models/${filename}`;
}

export async function POST(request: Request) {
  let body: GenerationBody;

  try {
    body = (await request.json()) as GenerationBody;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return Response.json(
      { error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or less.` },
      { status: 400 },
    );
  }

  const apiKey = process.env.WAVESPEED_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "WAVESPEED_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  try {
    const client = new Client(apiKey, {
      connectionTimeout: 60,
      maxConnectionRetries: 2,
      retryInterval: 2,
      timeout: 900,
    });

    const result = await client.run(
      MODEL,
      {
        art_style: "realistic",
        enable_pbr: true,
        enable_prompt_expansion: true,
        prompt,
        should_remesh: true,
        symmetry_mode: "auto",
        ta_pose: false,
        target_polycount: 30000,
        texture_prompt:
          "high resolution PBR materials, crisp surface detail, realistic roughness, clean UVs, studio quality texture maps",
        topology: "triangle",
      },
      {
        pollInterval: 3,
        timeout: 900,
      },
    );

    const outputUrl = extractOutputUrl(result.outputs?.[0]);

    if (!outputUrl) {
      throw new Error("WaveSpeed did not return a model URL.");
    }

    const modelUrl = await cacheModel(outputUrl);

    return Response.json({
      modelUrl,
      sourceUrl: outputUrl,
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 502 });
  }
}
