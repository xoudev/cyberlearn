// @vitest-environment jsdom
import React, { lazy } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";

/**
 * The windows the address opens: the host draws the one a parameter names,
 * the hook opens it as a step of the history and closes it by stepping back
 * over that step, or by taking the parameter off an address it came with.
 */

// Next follows the History API in useSearchParams; here the address is read
// the same way, again after each pushState, replaceState and popstate.
const address = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    listeners,
    notify(): void {
      for (const listener of listeners) listener();
    },
  };
});

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  function subscribe(listener: () => void): () => void {
    address.listeners.add(listener);
    window.addEventListener("popstate", listener);
    return () => {
      address.listeners.delete(listener);
      window.removeEventListener("popstate", listener);
    };
  }
  return {
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search)),
  };
});

function NewsDrawer({ value, onClose }: QueryDialogProps): React.JSX.Element {
  return (
    <div role="dialog" aria-label="Nouveautés">
      <p>{`nouveautés ${value}`}</p>
      <button type="button" onClick={onClose}>
        fermer
      </button>
    </div>
  );
}

function TicketDrawer({ value }: QueryDialogProps): React.JSX.Element {
  return <div role="dialog" aria-label={`Demande ${value}`} />;
}

vi.mock("../query-dialogs", () => ({
  QUERY_DIALOGS: {
    // Loaded when asked for, as a real entry is.
    news: lazy(() => Promise.resolve({ default: NewsDrawer })),
    ticket: TicketDrawer,
  },
}));

import { useQueryDialog } from "@/hooks/use-query-dialog";
import { QueryDialogHost } from "../query-dialog-host";

function Triggers(): React.JSX.Element {
  const news = useQueryDialog("news");
  const ticket = useQueryDialog("ticket");
  return (
    <>
      <button
        type="button"
        onClick={() => {
          news.open();
        }}
      >
        ouvrir les nouveautés
      </button>
      <button
        type="button"
        onClick={() => {
          ticket.open("t-2");
        }}
      >
        ouvrir la demande 2
      </button>
      <button type="button" onClick={news.close}>
        fermer les nouveautés deux fois
      </button>
    </>
  );
}

function renderSite(): void {
  render(
    <>
      <Triggers />
      <QueryDialogHost />
    </>,
  );
}

function here(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}`;
}

/** Back or Forward, and the popstate that follows it. */
async function traverse(step: () => void): Promise<void> {
  await act(async () => {
    const arrived = new Promise<void>((resolve) => {
      window.addEventListener(
        "popstate",
        () => {
          resolve();
        },
        { once: true },
      );
    });
    step();
    await arrived;
  });
}

beforeEach(() => {
  window.history.replaceState(null, "", "/dashboard");
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, "pushState").mockImplementation((data, unused, url) => {
    push(data, unused, url);
    address.notify();
  });
  vi.spyOn(window.history, "replaceState").mockImplementation((data, unused, url) => {
    replace(data, unused, url);
    address.notify();
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the windows of the address", () => {
  it("draws none while the address names none", () => {
    window.history.replaceState(null, "", "/dashboard?tab=2&unknown=1");
    renderSite();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws the one the address names, once its code has arrived", async () => {
    window.history.replaceState(null, "", "/dashboard?news=1");
    renderSite();
    expect(await screen.findByText("nouveautés 1")).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: /Demande/ })).toBeNull();
  });

  it("hands the window the parameter's value", () => {
    window.history.replaceState(null, "", "/support?ticket=t-1");
    renderSite();
    expect(screen.getByRole("dialog", { name: "Demande t-1" })).toBeTruthy();
  });

  it("opens as a step of the history, and closes by stepping back over it", async () => {
    renderSite();
    const before = window.history.length;
    fireEvent.click(screen.getByText("ouvrir les nouveautés"));
    expect(here()).toBe("/dashboard?news=1");
    expect(window.history.length).toBe(before + 1);
    expect(await screen.findByText("nouveautés 1")).toBeTruthy();

    await traverse(() => {
      fireEvent.click(screen.getByText("fermer"));
    });
    expect(here()).toBe("/dashboard");
    expect(screen.queryByRole("dialog")).toBeNull();

    // Forward opens it again: the step is still there.
    await traverse(() => {
      window.history.forward();
    });
    expect(here()).toBe("/dashboard?news=1");
    expect(await screen.findByText("nouveautés 1")).toBeTruthy();
  });

  it("closes on the browser's Back, like a page would", async () => {
    renderSite();
    fireEvent.click(screen.getByText("ouvrir les nouveautés"));
    await screen.findByText("nouveautés 1");
    await traverse(() => {
      window.history.back();
    });
    expect(here()).toBe("/dashboard");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes off the parameter an address came with, and keeps the rest of it", async () => {
    window.history.replaceState(null, "", "/lessons?news=1&tab=2#haut");
    renderSite();
    const before = window.history.length;
    fireEvent.click(await screen.findByText("fermer"));
    expect(here()).toBe("/lessons?tab=2#haut");
    expect(window.history.length).toBe(before);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("steps back once, however many times it is closed before the step is taken", async () => {
    window.history.pushState(null, "", "/lessons");
    window.history.pushState(null, "", "/dashboard");
    renderSite();
    fireEvent.click(screen.getByText("ouvrir les nouveautés"));
    await screen.findByText("nouveautés 1");
    const back = vi.spyOn(window.history, "back");

    await traverse(() => {
      fireEvent.click(screen.getByText("fermer les nouveautés deux fois"));
      fireEvent.click(screen.getByText("fermer les nouveautés deux fois"));
    });
    expect(back).toHaveBeenCalledTimes(1);
    expect(here()).toBe("/dashboard");
  });

  it("changes the value of an open window in place, without another step", () => {
    window.history.replaceState(null, "", "/support?ticket=t-1");
    renderSite();
    const before = window.history.length;
    fireEvent.click(screen.getByText("ouvrir la demande 2"));
    expect(here()).toBe("/support?ticket=t-2");
    expect(window.history.length).toBe(before);
    expect(screen.getByRole("dialog", { name: "Demande t-2" })).toBeTruthy();
  });
});
