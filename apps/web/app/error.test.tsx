// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The error page of the routes outside the signed-in app (landing, public
 * catalogue, public profile, certificate verification). Without it a failure
 * there replaced the whole document with global-error.
 */

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({ captureException }));

const { default: SiteError } = await import("./error");

afterEach(() => {
  cleanup();
  captureException.mockReset();
});

describe("SiteError", () => {
  it("says what happened in French, reports it, and offers a retry", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    const reset = vi.fn();
    render(<SiteError error={error} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Cette page n’a pas pu se charger." })).toBeTruthy();
    expect(captureException).toHaveBeenCalledWith(error);

    fireEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("carries the incident's reference to the report form", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<SiteError error={error} reset={vi.fn()} />);
    expect(screen.getByText("ID : abc123")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Signaler le problème" }).getAttribute("href")).toBe(
      "/contact?ref=abc123",
    );
  });

  it("leads home, and to the plain report form without a reference", () => {
    render(<SiteError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Retour à l’accueil" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Signaler le problème" }).getAttribute("href")).toBe(
      "/contact",
    );
  });
});
