import { describe, expect, it } from "vitest";
import { cleanMessage } from "../model-studio";

describe("cleanMessage", () => {
  it("returns a plain message unchanged", () => {
    expect(cleanMessage("a red cube")).toBe("a red cube");
  });

  it("strips [Search: ...] wrapper", () => {
    expect(cleanMessage("[Search: a red cube]")).toBe("a red cube");
  });

  it("strips [Think: ...] wrapper", () => {
    expect(cleanMessage("[Think: how to build a sphere]")).toBe(
      "how to build a sphere",
    );
  });

  it("strips [Canvas: ...] wrapper", () => {
    expect(cleanMessage("[Canvas: draw something]")).toBe("draw something");
  });

  it("trims whitespace from the result", () => {
    expect(cleanMessage("  hello world  ")).toBe("hello world");
  });

  it("trims whitespace inside a wrapper", () => {
    expect(cleanMessage("[Search:   padded prompt   ]")).toBe("padded prompt");
  });

  it("does not strip unrecognized wrappers", () => {
    expect(cleanMessage("[Other: some text]")).toBe("[Other: some text]");
  });

  it("handles multiline content inside wrapper", () => {
    expect(cleanMessage("[Search: line1\nline2]")).toBe("line1\nline2");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(cleanMessage("   ")).toBe("");
  });
});
