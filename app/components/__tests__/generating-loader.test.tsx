import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GeneratingLoader } from "../generating-loader";

describe("GeneratingLoader", () => {
  it("renders with status role for accessibility", () => {
    render(<GeneratingLoader />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the first build step by default", () => {
    render(<GeneratingLoader />);
    expect(screen.getByText("Sketching the chassis")).toBeInTheDocument();
  });

  it("renders the prompt caption when provided", () => {
    render(<GeneratingLoader prompt="a red cube" />);
    expect(screen.getByText("a red cube")).toBeInTheDocument();
  });

  it("does not render a caption when prompt is omitted", () => {
    const { container } = render(<GeneratingLoader />);
    expect(container.querySelector(".generating-caption")).toBeNull();
  });

  it("renders the car SVG illustration", () => {
    const { container } = render(<GeneratingLoader />);
    expect(container.querySelector(".build-car")).toBeInTheDocument();
  });
});
