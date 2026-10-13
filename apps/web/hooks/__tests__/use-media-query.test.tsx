// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { stubMatchMedia } from "@/test/match-media";
import { useMediaQuery } from "../use-media-query";

afterEach(cleanup);

function Width(): React.ReactElement {
  return <p>{useMediaQuery("(min-width: 1440px)") ? "large" : "small"}</p>;
}

describe("useMediaQuery", () => {
  it("answers what the window matches", () => {
    stubMatchMedia((query) => query === "(min-width: 1440px)");
    render(<Width />);
    expect(screen.getByText("large")).toBeTruthy();
  });

  it("follows the window across the breakpoint", () => {
    const media = stubMatchMedia(() => false);
    render(<Width />);
    expect(screen.getByText("small")).toBeTruthy();
    act(() => {
      media.set(() => true);
    });
    expect(screen.getByText("large")).toBeTruthy();
  });

  it("says no on the server, which has no window", () => {
    stubMatchMedia(() => true);
    expect(renderToString(<Width />)).toContain("small");
  });
});
