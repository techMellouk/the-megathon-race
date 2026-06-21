import { describe, expect, it, vi, beforeEach } from "vitest";
import { extractOutputUrl, extensionFor, POST } from "../route";

// ---------------------------------------------------------------------------
// Pure utility tests
// ---------------------------------------------------------------------------

describe("extractOutputUrl", () => {
  it("returns a plain string output directly", () => {
    expect(extractOutputUrl("https://example.com/model.glb")).toBe(
      "https://example.com/model.glb",
    );
  });

  it("extracts url key from an object", () => {
    expect(extractOutputUrl({ url: "https://a.com/m.glb" })).toBe(
      "https://a.com/m.glb",
    );
  });

  it("extracts download_url key from an object", () => {
    expect(extractOutputUrl({ download_url: "https://b.com/m.glb" })).toBe(
      "https://b.com/m.glb",
    );
  });

  it("extracts model_url key from an object", () => {
    expect(extractOutputUrl({ model_url: "https://c.com/m.glb" })).toBe(
      "https://c.com/m.glb",
    );
  });

  it("extracts file key from an object", () => {
    expect(extractOutputUrl({ file: "https://d.com/m.gltf" })).toBe(
      "https://d.com/m.gltf",
    );
  });

  it("returns null for null/undefined", () => {
    expect(extractOutputUrl(null)).toBeNull();
    expect(extractOutputUrl(undefined)).toBeNull();
  });

  it("returns null for a number", () => {
    expect(extractOutputUrl(123)).toBeNull();
  });

  it("returns null for an object with no recognized keys", () => {
    expect(extractOutputUrl({ other: "value" })).toBeNull();
  });

  it("returns null for an object where known keys are not strings", () => {
    expect(extractOutputUrl({ url: 42, file: true })).toBeNull();
  });

  it("prefers url over later keys when both present", () => {
    expect(
      extractOutputUrl({ url: "first", download_url: "second" }),
    ).toBe("first");
  });
});

describe("extensionFor", () => {
  it("returns .glb when URL pathname ends in .glb", () => {
    expect(extensionFor("https://cdn.example.com/model.glb", null)).toBe(".glb");
  });

  it("returns .gltf when URL pathname ends in .gltf", () => {
    expect(extensionFor("https://cdn.example.com/model.gltf", null)).toBe(".gltf");
  });

  it("falls back to content type for gltf+json", () => {
    expect(extensionFor("https://cdn.example.com/model", "model/gltf+json")).toBe(
      ".gltf",
    );
  });

  it("defaults to .glb when URL has no extension and content type is unrecognized", () => {
    expect(extensionFor("https://cdn.example.com/model", "application/octet-stream")).toBe(
      ".glb",
    );
  });

  it("defaults to .glb when URL has an unrecognized extension", () => {
    expect(extensionFor("https://cdn.example.com/model.obj", null)).toBe(".glb");
  });

  it("defaults to .glb when URL is malformed and content type is null", () => {
    expect(extensionFor("not-a-url", null)).toBe(".glb");
  });
});

// ---------------------------------------------------------------------------
// POST handler tests
// ---------------------------------------------------------------------------

describe("POST /api/generate", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 for invalid JSON body", async () => {
    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      body: "not json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Request body must be valid JSON.");
  });

  it("returns 400 when prompt is missing", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Prompt is required.");
  });

  it("returns 400 when prompt is empty string", async () => {
    const response = await POST(makeRequest({ prompt: "   " }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Prompt is required.");
  });

  it("returns 400 when prompt is not a string", async () => {
    const response = await POST(makeRequest({ prompt: 42 }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Prompt is required.");
  });

  it("returns 400 when prompt exceeds max length", async () => {
    const longPrompt = "a".repeat(601);
    const response = await POST(makeRequest({ prompt: longPrompt }));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("600 characters or less");
  });

  it("returns 500 when WAVESPEED_API_KEY is not set", async () => {
    delete process.env.WAVESPEED_API_KEY;
    const response = await POST(makeRequest({ prompt: "a red cube" }));
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("WAVESPEED_API_KEY");
  });
});
