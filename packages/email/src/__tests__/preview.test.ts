import { describe, expect, it } from "vitest";
import { EMAIL_SAMPLES, renderEmailSample } from "../preview";

/**
 * The catalogue and the renderer, which must not drift apart.
 *
 * They are two halves of one thing - a list of keys, and a switch over those
 * keys - and nothing in the type system ties them together. A sample added to
 * the list with no case beside it shows an empty pane in the console, which
 * reads as a broken template rather than a missing one.
 */

describe("every sample in the list renders", () => {
  it.each(EMAIL_SAMPLES.map((s) => [s.key, s.label]))("%s (%s)", async (key) => {
    const html = await renderEmailSample(key);
    expect(html).not.toBeNull();
    // Rendered, not merely non-null: an empty string would pass a null check
    // and show nothing.
    expect(html?.length ?? 0).toBeGreaterThan(500);
    expect(html).toContain("CYBER LEARN");
  });
});

describe("the catalogue itself", () => {
  it("names every key once", () => {
    const keys = EMAIL_SAMPLES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("says what each one is and when it goes out", () => {
    // Both are read by a person choosing from a list of ten.
    for (const sample of EMAIL_SAMPLES) {
      expect(sample.label.trim()).not.toBe("");
      expect(sample.when.trim()).not.toBe("");
    }
  });

  it("gives nothing back for a key it does not know", () => {
    return expect(renderEmailSample("pas-un-modele")).resolves.toBeNull();
  });
});
