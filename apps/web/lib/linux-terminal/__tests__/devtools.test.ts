import { describe, expect, it } from "vitest";
import { DEVTOOLS_FILE, DEVTOOLS_MEMORY_SIZE, installDevtoolsCommand } from "../devtools";
import { LESSON_DIR } from "../session";

describe("installDevtoolsCommand", () => {
  it("raises the tmpfs cap, extracts the archive stripping its leading dot, then removes it", () => {
    const steps = installDevtoolsCommand().split("; ");
    expect(steps[0]).toBe("mount -o remount,size=200m /");
    expect(steps[1]).toBe(`tar xf ${LESSON_DIR}/${DEVTOOLS_FILE} -C / --strip-components=1`);
    expect(steps[2]).toBe(`rm -f ${LESSON_DIR}/${DEVTOOLS_FILE}`);
    expect(steps).toHaveLength(3);
  });
});

describe("DEVTOOLS_MEMORY_SIZE", () => {
  it("gives the machine enough room for the toolchain once extracted", () => {
    expect(DEVTOOLS_MEMORY_SIZE).toBeGreaterThanOrEqual(200 * 1024 * 1024);
  });
});
