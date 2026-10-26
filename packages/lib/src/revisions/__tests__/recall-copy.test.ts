import { describe, expect, it } from "vitest";
import {
  RECALL_STATE_ACTION,
  RECALL_STATE_LABEL,
  RECALL_STATE_TEXT,
  recallVerdictTitle,
} from "../recall-copy";

describe("the day's recall, as the dashboard and the home tab say it", () => {
  it("never counts what waits", () => {
    // The state is a word: no figure that grows while one is away.
    for (const label of Object.values(RECALL_STATE_LABEL)) expect(label).not.toMatch(/\d/u);
    expect(RECALL_STATE_TEXT.done).not.toMatch(/\d/u);
    expect(RECALL_STATE_TEXT.empty).not.toMatch(/\d/u);
  });

  it("offers to open it only when there is something to open", () => {
    expect(RECALL_STATE_ACTION.todo).toBe("Commencer");
    expect(RECALL_STATE_ACTION.done).toBe("Revoir mes réponses");
    expect(RECALL_STATE_ACTION.empty).toBeNull();
  });
});

describe("recallVerdictTitle", () => {
  it("says right, or which option was", () => {
    expect(recallVerdictTitle(true, "rw- --- ---")).toBe("Bonne réponse.");
    expect(recallVerdictTitle(false, "rw- --- ---")).toBe("Raté. La bonne réponse : rw- --- ---.");
  });
});
