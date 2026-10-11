// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmButton } from "../confirm-button";

/**
 * A final action asks first, in place: the question takes the button's
 * place, "Annuler" takes the focus, Escape backs out to the button.
 */

afterEach(cleanup);

function renderButton(props: Partial<React.ComponentProps<typeof ConfirmButton>> = {}): {
  onConfirm: ReturnType<typeof vi.fn>;
  onAskingChange: ReturnType<typeof vi.fn>;
} {
  const onConfirm = vi.fn();
  const onAskingChange = vi.fn();
  render(
    <ConfirmButton
      className="btn btn--ghost btn--sm"
      question="Retirer Alex de tes amis ?"
      confirmLabel="Retirer"
      onConfirm={onConfirm}
      onAskingChange={onAskingChange}
      {...props}
    >
      Retirer
    </ConfirmButton>,
  );
  return { onConfirm, onAskingChange };
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
});
