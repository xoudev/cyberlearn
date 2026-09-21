import { describe, expect, it } from "vitest";
import {
  MODERATION_SURFACE,
  UNACTIONED_SURFACE,
  isActionableEvent,
} from "../repositories/moderation.repository.js";

/**
 * Whether a decision on an event can reach anything.
 *
 * The console drew "rétablir" and "supprimer" on every queue row and asked
 * nobody. On a note share both did nothing - that surface publishes no row, so
 * it has no handler - and the reviewer got no error either: the row closed and
 * the note stayed exactly where it was. A button that cannot work must not be
 * drawn, and this is the question the console now asks first.
 */

describe("isActionableEvent", () => {
  it("is true where there is a row to restore or destroy", () => {
    for (const surface of Object.values(MODERATION_SURFACE)) {
      expect(isActionableEvent(surface, "a-content-id")).toBe(true);
    }
  });

  it("is false for a surface that publishes nothing", () => {
    // Refusing a share writes no row anywhere, so a decision has nothing to
    // reach - whatever the event happens to carry.
    expect(isActionableEvent(UNACTIONED_SURFACE.noteShare, "a-content-id")).toBe(false);
    expect(isActionableEvent(UNACTIONED_SURFACE.noteShare, null)).toBe(false);
  });

  it("is false without a content id, whatever the surface", () => {
    // Events predating the decision to keep flagged content, and events whose
    // write failed after the screen. The decision is recorded; there is simply
    // nothing to carry it to.
    for (const surface of Object.values(MODERATION_SURFACE)) {
      expect(isActionableEvent(surface, null)).toBe(false);
    }
  });

  it("is false for a surface nobody handles, rather than throwing", () => {
    // The column is a string and old rows predate all of this.
    expect(isActionableEvent("lesson.rating", "a-content-id")).toBe(false);
    expect(isActionableEvent("", "a-content-id")).toBe(false);
  });
});
