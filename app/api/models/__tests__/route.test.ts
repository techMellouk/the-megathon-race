import { describe, expect, it } from "vitest";
import { MODEL_ID_PATTERN, contentTypeFor } from "../[modelId]/route";

describe("MODEL_ID_PATTERN", () => {
  it("matches a valid UUID-style .glb filename", () => {
    expect(MODEL_ID_PATTERN.test("a1b2c3d4-e5f6-7890-abcd-ef1234567890.glb")).toBe(true);
  });

  it("matches a valid UUID-style .gltf filename", () => {
    expect(MODEL_ID_PATTERN.test("a1b2c3d4-e5f6-7890-abcd-ef1234567890.gltf")).toBe(true);
  });

  it("matches a simple hex string with .glb", () => {
    expect(MODEL_ID_PATTERN.test("abcdef01.glb")).toBe(true);
  });

  it("rejects uppercase hex characters", () => {
    expect(MODEL_ID_PATTERN.test("ABCDEF01.glb")).toBe(false);
  });

  it("rejects unsupported extensions", () => {
    expect(MODEL_ID_PATTERN.test("abcdef01.obj")).toBe(false);
    expect(MODEL_ID_PATTERN.test("abcdef01.fbx")).toBe(false);
  });

  it("rejects filenames with path traversal", () => {
    expect(MODEL_ID_PATTERN.test("../abcdef01.glb")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(MODEL_ID_PATTERN.test("")).toBe(false);
  });

  it("rejects strings with non-hex characters", () => {
    expect(MODEL_ID_PATTERN.test("xyz123.glb")).toBe(false);
  });
});

describe("contentTypeFor", () => {
  it('returns "model/gltf+json" for .gltf files', () => {
    expect(contentTypeFor("abc123.gltf")).toBe("model/gltf+json");
  });

  it('returns "model/gltf-binary" for .glb files', () => {
    expect(contentTypeFor("abc123.glb")).toBe("model/gltf-binary");
  });

  it('returns "model/gltf-binary" for files without a recognized extension', () => {
    expect(contentTypeFor("abc123.obj")).toBe("model/gltf-binary");
  });
});
