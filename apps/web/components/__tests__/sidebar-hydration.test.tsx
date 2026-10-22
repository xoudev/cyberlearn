// @vitest-environment jsdom
import React from "react";
import Link from "next/link";
import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test/match-media";

const sidebar = vi.hoisted(() => ({
  state: "collapsed",
  isMobile: false,
  openMobile: false,
  setOpenMobile: vi.fn(),
}));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => sidebar }));
const { SidebarWrapper } = await import("../sidebar-wrapper");

it("hydrates a streamed rail after its provider has detected a mobile viewport", async () => {
  stubMatchMedia(() => true);
  const container = document.createElement("div");
  document.body.append(container);
  const navigation = (
    <SidebarWrapper>
      <Link href="/paths">Paths</Link>
    </SidebarWrapper>
  );
  sidebar.isMobile = false;
  container.innerHTML = renderToString(navigation);
  // The provider outside Suspense can finish hydrating before this streamed rail.
  sidebar.isMobile = true;
  const errors: unknown[] = [];
  const root = hydrateRoot(container, navigation, {
    onRecoverableError: (error) => {
      errors.push(error);
    },
  });
  try {
    await act(async () => {
      await Promise.resolve();
    });
    expect(errors).toEqual([]);
    expect(container.querySelector("aside")?.getAttribute("data-state")).toBe("expanded");
    expect(container.querySelector("aside")?.hasAttribute("inert")).toBe(true);
  } finally {
    act(() => {
      root.unmount();
    });
    container.remove();
  }
});
