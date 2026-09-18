import { describe, expect, it } from "vitest";
import { NAVBAR_HEIGHT, TOAST_TOP_OFFSET } from "../chrome";

describe("app chrome measurements", () => {
  it("starts a toast below the navbar rather than across it", () => {
    // The one thing that must stay true of these two numbers. A toast at the
    // top centre lands exactly where the search box and the notification bell
    // are, so the offset is not decoration: it is what keeps the bar usable
    // while a message is on screen.
    expect(TOAST_TOP_OFFSET).toBeGreaterThan(NAVBAR_HEIGHT);
  });
});
