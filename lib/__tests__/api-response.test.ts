import { describe, expect, it } from "vitest";
import { jsonError, jsonSuccess } from "../api-response";

describe("jsonError", () => {
  it("returns a Response with the given status code", async () => {
    const response = jsonError("Not found", 404);
    expect(response.status).toBe(404);
  });

  it("returns a JSON body with an error field", async () => {
    const response = jsonError("Bad request", 400);
    const data = await response.json();
    expect(data).toEqual({ error: "Bad request" });
  });

  it("works with 500 status", async () => {
    const response = jsonError("Internal error", 500);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal error");
  });
});

describe("jsonSuccess", () => {
  it("returns a 200 Response by default", async () => {
    const response = jsonSuccess({ ok: true });
    expect(response.status).toBe(200);
  });

  it("returns the data as JSON body", async () => {
    const response = jsonSuccess({ modelUrl: "/api/models/abc.glb", sourceUrl: "https://example.com" });
    const data = await response.json();
    expect(data).toEqual({ modelUrl: "/api/models/abc.glb", sourceUrl: "https://example.com" });
  });
});
