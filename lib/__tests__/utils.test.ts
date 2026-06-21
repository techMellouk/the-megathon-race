import { describe, expect, it } from "vitest";
import { cn, getErrorMessage } from "../utils";

describe("cn", () => {
  it("joins multiple class names", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "", "bar")).toBe("foo bar");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("returns single class unchanged", () => {
    expect(cn("only")).toBe("only");
  });
});

describe("getErrorMessage", () => {
  it("returns the message from an Error instance", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns the default fallback for non-Error values", () => {
    expect(getErrorMessage("string")).toBe("An unexpected error occurred.");
    expect(getErrorMessage(42)).toBe("An unexpected error occurred.");
    expect(getErrorMessage(null)).toBe("An unexpected error occurred.");
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred.");
  });

  it("returns a custom fallback when provided", () => {
    expect(getErrorMessage("oops", "Custom fallback.")).toBe("Custom fallback.");
  });
});
