import { describe, expect, it } from "vitest";
import { lessonOrigin } from "../lesson-list.service";

describe("lessonOrigin", () => {
  it("tells the first catalogue, the new one and a teacher's class lesson apart", () => {
    expect(lessonOrigin("CL-LSN-042-V01", "CATALOGUE")).toBe("first");
    expect(lessonOrigin("CL-LSN-01042-V01", "CATALOGUE")).toBe("new");
    expect(lessonOrigin("CL-CLS-ab12cd-V01", "CLASS")).toBe("class");
  });

  it("reads the audience before the code: a class lesson is never a catalogue's", () => {
    expect(lessonOrigin("CL-LSN-042-V01", "CLASS")).toBe("class");
  });
});
