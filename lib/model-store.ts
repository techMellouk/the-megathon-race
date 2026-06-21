import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";

// Generated models are not persisted to local disk (that breaks on serverless
// hosts where the filesystem is read-only and not shared across instances).
// Instead the WaveSpeed output URL is signed into an opaque model id and served
// back through /api/models/<id>, which streams the file from WaveSpeed.
//
// The id is `base64url(sourceUrl).base64url(hmac)`. The HMAC (keyed off the
// server-only WAVESPEED_API_KEY) means clients cannot forge an id pointing at
// an arbitrary URL, so the proxy can never be turned into an SSRF vector.

function signingKey(): string {
  const key = process.env.WAVESPEED_API_KEY;
  if (!key) {
    throw new Error("WAVESPEED_API_KEY is not configured on the server.");
  }
  return key;
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function encodeModelId(sourceUrl: string): string {
  const payload = Buffer.from(sourceUrl, "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeModelId(modelId: string): string | null {
  const dot = modelId.lastIndexOf(".");
  if (dot <= 0) {
    return null;
  }

  const payload = modelId.slice(0, dot);
  const signature = modelId.slice(dot + 1);
  const expected = sign(payload);

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const url = new URL(Buffer.from(payload, "base64url").toString("utf8"));
    if (url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function modelExtension(modelId: string): "glb" | "gltf" {
  const sourceUrl = decodeModelId(modelId);
  if (sourceUrl) {
    try {
      const ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();
      if (ext === ".gltf") {
        return "gltf";
      }
    } catch {
      // Fall through to the default below.
    }
  }
  return "glb";
}

export function contentTypeForExtension(extension: "glb" | "gltf"): string {
  return extension === "gltf" ? "model/gltf+json" : "model/gltf-binary";
}
