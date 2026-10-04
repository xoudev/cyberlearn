import { describe, expect, it } from "vitest";
import { ANIMATION_SCENE_IDS, parseStepAnimation } from "../step-animation.schema.js";

describe("parseStepAnimation", () => {
  it("accepts every scene the site draws, with or without a caption", () => {
    for (const scene of ANIMATION_SCENE_IDS) {
      expect(parseStepAnimation({ id: "a", scene }).ok).toBe(true);
    }
    expect(parseStepAnimation({ id: "a", scene: "call-stack", caption: "Deux n." }).ok).toBe(true);
  });

  it("refuses a scene the site does not have, and says which prop", () => {
    const parsed = parseStepAnimation({ id: "a", scene: "dns" });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.problem.startsWith("scene : ")).toBe(true);
  });

  it("refuses an animation without an id, or with an empty caption", () => {
    expect(parseStepAnimation({ scene: "tcp-handshake" }).ok).toBe(false);
    expect(parseStepAnimation({ id: "a", scene: "tcp-handshake", caption: "  " }).ok).toBe(false);
  });
});
