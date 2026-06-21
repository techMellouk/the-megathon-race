import { Client } from "wavespeed";
import { getErrorMessage } from "@/lib/utils";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { encodeModelId } from "@/lib/model-store";

export const runtime = "nodejs";

const MODEL = "wavespeed-ai/hunyuan-3d-v3.1/text-to-3d-rapid";
const MAX_PROMPT_LENGTH = 600;
// Hunyuan rapid accepts a single prompt, max 200 UTF-8 characters.
const HUNYUAN_PROMPT_LIMIT = 200;

type GenerationBody = {
  prompt?: unknown;
};

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

class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export async function POST(request: Request) {
  let body: GenerationBody;

  try {
    body = (await request.json()) as GenerationBody;
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return jsonError("Prompt is required.", 400);
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(`Prompt must be ${MAX_PROMPT_LENGTH} characters or less.`, 400);
  }

  const apiKey = process.env.WAVESPEED_API_KEY;

  if (!apiKey) {
    return jsonError("WAVESPEED_API_KEY is not configured on the server.", 500);
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
        prompt: prompt.slice(0, HUNYUAN_PROMPT_LIMIT),
      },
      {
        pollInterval: 2,
        timeout: 900,
      },
    );

    const outputUrl = extractOutputUrl(result.outputs?.[0]);

    if (!outputUrl) {
      throw new UpstreamError("WaveSpeed did not return a model URL.");
    }

    const modelUrl = `/api/models/${encodeModelId(outputUrl)}`;

    return jsonSuccess({ modelUrl, sourceUrl: outputUrl });
  } catch (error) {
    const status = error instanceof UpstreamError ? 502 : 500;
    return jsonError(getErrorMessage(error, "Unknown generation error."), status);
  }
}
