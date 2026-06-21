import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PromptInputBox } from "../ai-prompt-box";

describe("PromptInputBox", () => {
  it("renders a textarea with the given placeholder", () => {
    render(<PromptInputBox placeholder="Describe an object..." />);
    expect(screen.getByPlaceholderText("Describe an object...")).toBeInTheDocument();
  });

  it("renders a textarea with default placeholder when none specified", () => {
    render(<PromptInputBox />);
    expect(
      screen.getByPlaceholderText("Type your message here..."),
    ).toBeInTheDocument();
  });

  it("calls onSend with the trimmed message on submit", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<PromptInputBox onSend={onSend} placeholder="Type here" />);
    const textarea = screen.getByPlaceholderText("Type here");

    await user.type(textarea, "hello world");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("hello world");
  });

  it("does not call onSend when input is empty", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<PromptInputBox onSend={onSend} placeholder="Type here" />);
    const textarea = screen.getByPlaceholderText("Type here");

    await user.click(textarea);
    await user.keyboard("{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();

    render(<PromptInputBox onSend={vi.fn()} placeholder="Type here" />);
    const textarea = screen.getByPlaceholderText("Type here") as HTMLTextAreaElement;

    await user.type(textarea, "test message");
    await user.keyboard("{Enter}");

    expect(textarea.value).toBe("");
  });

  it("allows newline with Shift+Enter", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();

    render(<PromptInputBox onSend={onSend} placeholder="Type here" />);
    const textarea = screen.getByPlaceholderText("Type here");

    await user.type(textarea, "line1");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(textarea, "line2");

    expect(onSend).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toContain("line1");
    expect((textarea as HTMLTextAreaElement).value).toContain("line2");
  });
});
