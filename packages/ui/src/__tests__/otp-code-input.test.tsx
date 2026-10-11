import React, { useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OtpCodeInput, useOtpAutoSubmit } from "../components/otp-code-input.js";

/** The field and the rule together, the way every code screen uses them. */
function CodeScreen({
  onSubmit,
  pending = false,
}: {
  onSubmit: (code: string) => void;
  pending?: boolean;
}): React.JSX.Element {
  const [code, setCode] = useState("");
  const submit = useOtpAutoSubmit({ code, pending, onSubmit });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(code);
      }}
    >
      <OtpCodeInput label="Code temporaire" value={code} onValueChange={setCode} />
      <button type="submit">Valider</button>
    </form>
  );
}

function type(value: string): void {
  fireEvent.change(screen.getByLabelText("Code temporaire"), { target: { value } });
}

describe("OtpCodeInput", () => {
  it("is a labelled numeric field the browser can fill from a one-time code", () => {
    render(<OtpCodeInput label="Code temporaire" value="" onValueChange={vi.fn()} />);
    const input = screen.getByLabelText("Code temporaire");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveAttribute("autocomplete", "one-time-code");
    expect(input).toHaveFocus();
    // A maxLength would cut "123 456" to "123 45" before the filter runs.
    expect(input).not.toHaveAttribute("maxlength");
  });

  it("can be left without focus", () => {
    render(
      <OtpCodeInput label="Code temporaire" value="" onValueChange={vi.fn()} autoFocus={false} />,
    );
    expect(screen.getByLabelText("Code temporaire")).not.toHaveFocus();
  });

  it("hands back the digits of a pasted code", () => {
    const onValueChange = vi.fn();
    render(<OtpCodeInput label="Code temporaire" value="" onValueChange={onValueChange} />);
    type("123 456");
    expect(onValueChange).toHaveBeenLastCalledWith("123456");
    type("12-34-56-78");
    expect(onValueChange).toHaveBeenLastCalledWith("123456");
  });
});

describe("useOtpAutoSubmit", () => {
  it("sends the code on its sixth digit, without a click", () => {
    const onSubmit = vi.fn();
    render(<CodeScreen onSubmit={onSubmit} />);
    type("12345");
    expect(onSubmit).not.toHaveBeenCalled();
    type("123456");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith("123456");
  });

  it("does not send a refused code again on its own", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<CodeScreen onSubmit={onSubmit} />);
    type("123456");
    // The request runs and is refused; the six digits are still there.
    rerender(<CodeScreen onSubmit={onSubmit} pending />);
    rerender(<CodeScreen onSubmit={onSubmit} pending={false} />);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("lets Enter or the button insist on the same code, once each time", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<CodeScreen onSubmit={onSubmit} />);
    type("123456");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    });
    rerender(<CodeScreen onSubmit={onSubmit} pending />);
    rerender(<CodeScreen onSubmit={onSubmit} pending={false} />);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("sends a corrected code", () => {
    const onSubmit = vi.fn();
    render(<CodeScreen onSubmit={onSubmit} />);
    type("123456");
    type("12345");
    type("123457");
    expect(onSubmit).toHaveBeenNthCalledWith(2, "123457");
  });

  it("holds a code typed while a check is running, then sends it", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<CodeScreen onSubmit={onSubmit} pending />);
    type("654321");
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(<CodeScreen onSubmit={onSubmit} pending={false} />);
    expect(onSubmit).toHaveBeenCalledWith("654321");
  });
});
