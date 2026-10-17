// @vitest-environment jsdom
import React, { useRef } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubResizeObserver } from "@/test/resize-observer";
import { useElementWidth } from "../use-element-width";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Measured(): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const width = useElementWidth(ref);
  return <div ref={ref}>{width === null ? "unmeasured" : `${String(width)}px`}</div>;
}

describe("useElementWidth", () => {
  it("measures the element once it is on the page", () => {
    stubResizeObserver(480);
    render(<Measured />);
    expect(screen.getByText("480px")).toBeTruthy();
  });

  it("follows the element as it is resized", () => {
    const observer = stubResizeObserver(480);
    render(<Measured />);
    act(() => {
      observer.resize(900);
    });
    expect(screen.getByText("900px")).toBeTruthy();
  });

  it("stops watching when the element goes", () => {
    const observer = stubResizeObserver(480);
    const { unmount } = render(<Measured />);
    unmount();
    expect(observer.disconnected()).toBe(1);
  });

  it("knows nothing on the server, nor where the browser cannot observe", () => {
    expect(renderToString(<Measured />)).toContain("unmeasured");
    vi.stubGlobal("ResizeObserver", undefined);
    render(<Measured />);
    expect(screen.getByText("unmeasured")).toBeTruthy();
  });
});
