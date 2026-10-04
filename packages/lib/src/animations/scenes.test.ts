import { ANIMATION_SCENE_IDS } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { ANIMATION_SCENES, sceneById, stepAt, stepBounds, totalFrames } from "./scenes";

describe("the animation scenes", () => {
  it("exist for every id the schema accepts, and say something at every step", () => {
    for (const id of ANIMATION_SCENE_IDS) {
      const scene = sceneById(id);
      expect(scene?.id).toBe(id);
      expect(scene?.steps.length).toBeGreaterThanOrEqual(4);
      for (const step of scene?.steps ?? []) {
        expect(step.text.length).toBeGreaterThan(40);
        expect(step.frames).toBeGreaterThanOrEqual(30);
      }
    }
    expect(sceneById("dns")).toBeUndefined();
  });

  it("counts frames step by step, and finds the step of a frame", () => {
    const scene = ANIMATION_SCENES["tcp-handshake"];
    expect(totalFrames(scene)).toBe(420);
    expect(stepBounds(scene, 0)).toEqual({ from: 0, to: 60 });
    expect(stepBounds(scene, 1)).toEqual({ from: 60, to: 150 });
    expect(stepBounds(scene, 4)).toEqual({ from: 330, to: 420 });
    expect(stepAt(scene, 0)).toBe(0);
    expect(stepAt(scene, 59)).toBe(0);
    expect(stepAt(scene, 60)).toBe(1);
    expect(stepAt(scene, 419)).toBe(4);
  });
});
