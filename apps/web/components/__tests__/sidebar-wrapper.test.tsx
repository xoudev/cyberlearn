// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sidebar = vi.hoisted(() => ({
  state: "collapsed",
  isMobile: true,
  openMobile: false,
  setOpenMobile: vi.fn<(value: boolean) => void>(),
}));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => sidebar }));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => sidebar.isMobile }));
const { SidebarWrapper } = await import("../sidebar-wrapper");

function Navigation(): React.JSX.Element {
  return (
    <>
      <button type="button">Open navigation</button>
      <SidebarWrapper>
        <a href="#paths">Paths</a>
        <button type="button">Account</button>
      </SidebarWrapper>
    </>
  );
}

beforeEach(() => {
  sidebar.state = "collapsed";
  sidebar.isMobile = true;
  sidebar.openMobile = false;
  sidebar.setOpenMobile.mockReset();
});
afterEach(cleanup);

describe("responsive navigation drawer", () => {
  it("does not expose closed mobile destinations even when the desktop rail was collapsed", () => {
    const view = render(<Navigation />);
    const drawer = view.container.querySelector("aside");
    expect(drawer?.getAttribute("data-state")).toBe("expanded");
    expect(drawer?.hasAttribute("inert")).toBe(true);
  });

  it("moves focus into the opened drawer, closes with Escape and restores the trigger", () => {
    const view = render(<Navigation />);
    const trigger = screen.getByRole("button", { name: "Open navigation" });
    trigger.focus();
    sidebar.openMobile = true;
    view.rerender(<Navigation />);
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Paths" }));
    expect(screen.getByRole("dialog", { name: "Navigation" }).getAttribute("aria-modal")).toBe(
      "true",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(sidebar.setOpenMobile).toHaveBeenCalledWith(false);
    sidebar.openMobile = false;
    view.rerender(<Navigation />);
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps the desktop rail accessible without treating it as a modal", () => {
    sidebar.isMobile = false;
    render(<Navigation />);
    const rail = screen.getByRole("complementary");
    expect(rail.getAttribute("data-state")).toBe("collapsed");
    expect(rail.hasAttribute("inert")).toBe(false);
    expect(rail.hasAttribute("aria-modal")).toBe(false);
  });
});
