import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LinkedInButton } from "../linkedin-button";

describe("LinkedInButton", () => {
  it("renders a link to the LinkedIn profile", () => {
    render(<LinkedInButton />);
    const link = screen.getByRole("link", { name: /ayman mellouk on linkedin/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/aymanmellouk/",
    );
  });

  it("opens in a new tab with security attributes", () => {
    render(<LinkedInButton />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the name text", () => {
    render(<LinkedInButton />);
    expect(screen.getByText("Ayman Mellouk")).toBeInTheDocument();
  });

  it("renders a tooltip with profile prompt", () => {
    render(<LinkedInButton />);
    expect(screen.getByRole("tooltip")).toHaveTextContent("See my profile!");
  });

  it("contains an SVG icon", () => {
    const { container } = render(<LinkedInButton />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
