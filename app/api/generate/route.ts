import { Client } from "wavespeed";
import { jsonError, jsonSuccess } from "@/lib/api-response";
import { encodeModelId } from "@/lib/model-store";

export const runtime = "nodejs";

const MODEL = "wavespeed-ai/hunyuan-3d-v3.1/text-to-3d-rapid";
const MAX_PROMPT_LENGTH = 600;
// Hunyuan rapid accepts a single prompt, max 200 UTF-8 characters.
const HUNYUAN_PROMPT_LIMIT = 200;

/* ------------------------------------------------------------------ */
/*  Simple in-memory sliding-window rate limiter (per IP, 5 req / 60s) */
/* ------------------------------------------------------------------ */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

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

  /* ---------- Rate-limit by client IP ---------- */
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (isRateLimited(ip)) {
    return jsonError("Too many requests. Please wait a minute and try again.", 429);
  }

  const apiKey = process.env.WAVESPEED_API_KEY;

  if (!apiKey) {
    // Generic message – never leak env-var names to the client.
    return jsonError("The generation service is not configured. Please contact the administrator.", 500);
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
    // Log the real error server-side; return a safe generic message.
    console.error("[generate] upstream error:", error);
    const status = error instanceof UpstreamError ? 502 : 500;
    return jsonError("Model generation failed. Please try again later.", status);
  }
}
