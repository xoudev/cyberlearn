import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "../progress-bar";

describe("ProgressBar", () => {
  it("says what it measures and how far it is", () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={3} max={7} label="Quêtes de la semaine" />,
    );
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Quêtes de la semaine"');
    expect(html).toContain('aria-valuemax="7"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain("width:42.9%");
    expect(html).toContain('class="pbar pbar--sm"');
  });

  it("stays between empty and full, whatever it is given", () => {
    expect(renderToStaticMarkup(<ProgressBar value={140} label="x" />)).toContain("width:100.0%");
    expect(renderToStaticMarkup(<ProgressBar value={-3} label="x" />)).toContain("width:0.0%");
    expect(renderToStaticMarkup(<ProgressBar value={2} max={0} label="x" />)).toContain(
      "width:0.0%",
    );
  });

  it("lights its tip only once there is a fill to end", () => {
    expect(renderToStaticMarkup(<ProgressBar value={0} tip label="x" />)).not.toContain(
      "pbar__fill--tip",
    );
    const html = renderToStaticMarkup(<ProgressBar value={40} tip size="xl" label="x" />);
    expect(html).toContain("pbar__fill--tip");
    expect(html).toContain("pbar--open");
    expect(html).toContain("pbar--xl");
  });

  it("draws a threshold, a colour of its own, the warning tone and the easing", () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={62} marker={70} color="#b14dff" animated label="Ton score" />,
    );
    expect(html).toContain('class="pbar__mark"');
    expect(html).toContain("left:70%");
    expect(html).toContain("--pbar-color:#b14dff");
    expect(html).toContain("pbar--color");
    expect(html).toContain("pbar--animated");
    expect(renderToStaticMarkup(<ProgressBar value={1} tone="warning" label="x" />)).toContain(
      "pbar--warning",
    );
  });
});
