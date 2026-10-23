// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubMatchMedia } from "@/test/match-media";

/**
 * The sidebar's shell: on a phone or a tablet it is a drawer, opened from the
 * navbar's button. It lives in the layout, which a navigation does not
 * remount, so it has to be closed by the navigation; and it is always
 * unfolded there, whatever the desktop's cookie says.
 */

const nav = vi.hoisted(() => ({ pathname: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
// The router is not mounted here: the link renders as the anchor it comes down to.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { default: Link } = await import("next/link");

const { SidebarProvider, useSidebar } = await import("@/components/ui/sidebar");
const { SidebarWrapper } = await import("../sidebar-wrapper");

/** What the navbar's button and the sidebar's own fold control do, from outside the drawer. */
function Controls(): React.ReactElement {
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpenMobile(true);
        }}
      >
        Ouvrir le menu
      </button>
      <output data-testid="drawer">{openMobile ? "open" : "closed"}</output>
    </>
  );
}

function Page({ folded = false }: { folded?: boolean }): React.ReactElement {
  return (
    <SidebarProvider defaultOpen={!folded}>
      <Controls />
      <SidebarWrapper>
        <Link
          href="/forum"
          onClick={(event) => {
            // jsdom cannot navigate, and the router would have taken the click.
            event.preventDefault();
          }}
        >
          Forum
        </Link>
        <button type="button">Déconnexion</button>
      </SidebarWrapper>
    </SidebarProvider>
  );
}

function drawer(): string {
  return screen.getByTestId("drawer").textContent;
}

function aside(): HTMLElement {
  const element = document.querySelector("aside");
  if (element === null) throw new Error("no sidebar");
  return element;
}

function atWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  stubMatchMedia((query) => query === "(max-width: 1023px)" && width < 1024);
}

beforeEach(() => {
  nav.pathname = "/dashboard";
  atWidth(375);
});

afterEach(cleanup);

describe("the drawer on a phone", () => {
  it("closes when the address changes, so the page asked for is the one in view", () => {
    const { rerender } = render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(drawer()).toBe("open");

    nav.pathname = "/leaderboard";
    rerender(<Page />);
    expect(drawer()).toBe("closed");
  });

  it("closes on a link to the page already open, which changes no address", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(drawer()).toBe("open");

    fireEvent.click(screen.getByRole("link", { name: "Forum" }));
    expect(drawer()).toBe("closed");
  });

  it("stays open under a tap that is not a link", () => {
    render(<Page />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    fireEvent.click(screen.getByRole("button", { name: "Déconnexion" }));
    expect(drawer()).toBe("open");
  });

  it("is unfolded, whatever the desktop's fold says: a column of icons has no names", () => {
    render(<Page folded />);
    expect(aside().getAttribute("data-state")).toBe("expanded");
  });
});

describe("the sidebar on a desktop", () => {
  beforeEach(() => {
    atWidth(1280);
  });

  it("keeps the fold it was given", () => {
    render(<Page folded />);
    expect(aside().getAttribute("data-state")).toBe("collapsed");
    expect(aside().style.width).toBe("60px");
  });

  it("is unfolded by default", () => {
    render(<Page />);
    expect(aside().getAttribute("data-state")).toBe("expanded");
    expect(aside().style.width).toBe("240px");
  });
});
