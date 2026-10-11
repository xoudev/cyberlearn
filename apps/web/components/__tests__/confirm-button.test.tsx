// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmButton } from "../confirm-button";

/**
 * A final action asks first, in place: the question takes the button's
 * place, "Annuler" takes the focus, Escape backs out to the button, and once
 * answered the focus is back on the button while it is still there.
 */

afterEach(cleanup);

const DETAIL = "Aucune notification ne part.";

function renderButton(props: Partial<React.ComponentProps<typeof ConfirmButton>> = {}): {
  onConfirm: ReturnType<typeof vi.fn>;
  onAskingChange: ReturnType<typeof vi.fn>;
  rerender: (next: Partial<React.ComponentProps<typeof ConfirmButton>>) => void;
} {
  const onConfirm = vi.fn();
  const onAskingChange = vi.fn();
  const element = (
    extra: Partial<React.ComponentProps<typeof ConfirmButton>>,
  ): React.JSX.Element => (
    <ConfirmButton
      className="btn btn--ghost btn--sm"
      question="Retirer Alex de tes amis ?"
      confirmLabel="Retirer"
      onConfirm={onConfirm}
      onAskingChange={onAskingChange}
      {...props}
      {...extra}
    >
      Retirer
    </ConfirmButton>
  );
  const { rerender } = render(element({}));
  return {
    onConfirm,
    onAskingChange,
    rerender: (next) => {
      rerender(element(next));
    },
  };
}

describe("ConfirmButton", () => {
  it("asks before acting, with the focus on the way out", () => {
    const { onConfirm, onAskingChange } = renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onAskingChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("group", { name: "Retirer Alex de tes amis ?" })).toBeTruthy();
    expect(screen.getByText("Retirer Alex de tes amis ?")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Annuler" }));
  });

  it("acts once the question is answered", () => {
    const { onConfirm, onAskingChange } = renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onAskingChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("backs out on Annuler or Escape, and hands the focus back to the button", () => {
    const { onConfirm } = renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retirer" }));

    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Annuler" }), { key: "Escape" });
    expect(screen.queryByRole("group")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps the question out of sight where the row says it, but still names the group", () => {
    renderButton({ showQuestion: false });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(screen.getByRole("group", { name: "Retirer Alex de tes amis ?" })).toBeTruthy();
    expect(screen.queryByText("Retirer Alex de tes amis ?")).toBeNull();
  });

  it("acts straight away when there is nothing to ask", () => {
    const { onConfirm } = renderButton({ ask: false });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("says what answering yes does, under the question and as its description", () => {
    renderButton({ detail: DETAIL });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    const group = screen.getByRole("group", { name: "Retirer Alex de tes amis ?" });
    expect(screen.getByText(DETAIL)).toBeTruthy();
    expect(group.getAttribute("aria-describedby")).toBe(screen.getByText(DETAIL).id);
  });

  it("keeps the detail as the description only where the question is not drawn", () => {
    renderButton({ detail: DETAIL, showQuestion: false });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    const group = screen.getByRole("group", { name: "Retirer Alex de tes amis ?" });
    const detail = screen.getByText(DETAIL);
    expect(detail.hidden).toBe(true);
    expect(group.getAttribute("aria-describedby")).toBe(detail.id);
  });

  it("hands the focus back to the button after a confirm, and keeps it while pending", () => {
    const { onConfirm, rerender } = renderButton();
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    // The call starts: the button holds, without dropping the focus.
    rerender({ pending: true });
    const trigger = screen.getByRole("button", { name: "Retirer" });
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(trigger);
    expect(screen.queryByRole("group")).toBeNull();

    // A refusal leaves the button where it was, focus included.
    rerender({ pending: false });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Retirer" }));
    expect(screen.getByRole("button", { name: "Retirer" }).hasAttribute("aria-disabled")).toBe(
      false,
    );
  });

  it("ignores a press while the last call is still running", () => {
    const { onConfirm } = renderButton({ ask: false, pending: true });
    fireEvent.click(screen.getByRole("button", { name: "Retirer" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
