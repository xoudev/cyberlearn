// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The error page of the signed-in app. Its "Signaler le problème" opens the
 * request window over /support, with the incident written in it, instead of
 * the visitors' contact page, where the address is typed by hand.
 */

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { default: AppError } = await import("../error");

afterEach(cleanup);

describe("the app's error page", () => {
  it("carries the incident's reference into the request window", () => {
    const error = Object.assign(new Error("boom"), { digest: "1234567890" });
    render(<AppError error={error} reset={vi.fn()} />);
    expect(screen.getByText("ID : 1234567890")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Signaler le problème" }).getAttribute("href")).toBe(
      "/support?request=incident-1234567890",
    );
  });

  it("opens the window empty when the error has no reference", () => {
    render(<AppError error={new Error("boom")} reset={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Signaler le problème" }).getAttribute("href")).toBe(
      "/support?request=1",
    );
  });
});
