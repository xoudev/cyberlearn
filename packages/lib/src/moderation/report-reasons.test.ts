import { describe, expect, it } from "vitest";
import { NOTE_REPORT_REASON_KEYS, NOTE_REPORT_REASON_LABELS } from "../notes/report-reasons.js";
import { surfaceNoun } from "./notice.js";
import {
  CONTENT_NOTICE_SURFACE,
  CONTENT_REPORT_REASON_KEYS,
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_REPORT_SURFACE_KEYS,
  CONTENT_SURFACE_LABEL,
  contentReportLabel,
  contentReportQuestion,
  isContentReportSurface,
} from "./report-reasons.js";

describe("content report wording", () => {
  it("offers a reported note's reasons, word for word", () => {
    // Two lists that differ by a word would read as two policies.
    expect(CONTENT_REPORT_REASON_KEYS).toEqual(NOTE_REPORT_REASON_KEYS);
    expect(CONTENT_REPORT_REASON_LABELS).toEqual(NOTE_REPORT_REASON_LABELS);
  });

  it("names the content in the button and the question", () => {
    expect(contentReportLabel("FORUM_POST")).toBe("Signaler ce message");
    expect(contentReportLabel("LESSON_ANSWER")).toBe("Signaler cette réponse");
    expect(contentReportQuestion("CHALLENGE_WRITEUP")).toBe("Pourquoi signaler cette solution ?");
    expect(contentReportQuestion("CLASS_RESOURCE")).toBe("Pourquoi signaler cette ressource ?");
  });

  it("gives every surface a console label and a noun the notices know", () => {
    for (const surface of CONTENT_REPORT_SURFACE_KEYS) {
      expect(CONTENT_SURFACE_LABEL[surface]).not.toBe("");
      // The notices fall back to "ton message" for a surface they were never
      // taught: every surface here has to be one they were.
      const noun = surfaceNoun(CONTENT_NOTICE_SURFACE[surface]);
      expect(noun === "ton message").toBe(surface === "FORUM_POST");
    }
  });

  it("recognises a surface, and nothing else", () => {
    expect(isContentReportSurface("LESSON_QUESTION")).toBe(true);
    expect(isContentReportSurface("forum.post")).toBe(false);
    expect(isContentReportSurface("")).toBe(false);
  });
});
