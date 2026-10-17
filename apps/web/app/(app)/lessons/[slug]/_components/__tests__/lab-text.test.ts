import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LAB_LABEL_SIZE, LAB_MONO_SIZE, labKicker } from "../lab-text";

/**
 * A lab's labels were 10 and 11px, the kicker of its head included: the size
 * of a footnote, on the parts a learner reads to know what to do. They are
 * 12px now, the monospace content 13px, and the labs are read here for any
 * size that slipped back under the floor. The terminals and the editors are
 * labs too: their window's title, their status line, their hints, the
 * explanation of a command, the draft's controls. An icon drawn at a share of
 * the label it leads (the ▶ of a run button, in `em`) is not text and is not
 * counted.
 */

const LABS = [
  "code-playground.tsx",
  "command-explanation.tsx",
  "crypto-workshop.tsx",
  "find-the-flaw.tsx",
  "firewall-lab.tsx",
  "git-sandbox.tsx",
  "hex-editor.tsx",
  "incident-story.tsx",
  "jwt-lab.tsx",
  "linux-terminal.tsx",
  "log-hunt.tsx",
  "match-pairs.tsx",
  "network-lab.tsx",
  "network-panel.tsx",
  "packet-dissector.tsx",
  "password-lab.tsx",
  "phishing-email.tsx",
  "photo-osint.tsx",
  "php-lab.tsx",
  "put-in-order.tsx",
  "python-challenge.tsx",
  "python-status.tsx",
  "simulated-terminal.tsx",
  "sql-injection-lab.tsx",
  "sql-playground.tsx",
  "sql-result-table.tsx",
  "step-animation.tsx",
  "subnet-drill.tsx",
];

const source = (file: string): string => readFileSync(path.resolve(__dirname, "..", file), "utf8");

describe("the text sizes of a lab", () => {
  it("set a label at 12px and the monospace at 13px", () => {
    expect(LAB_LABEL_SIZE).toBe(12);
    expect(LAB_MONO_SIZE).toBe(13);
    expect(labKicker("red")).toEqual({
      fontFamily: "var(--font-mono, monospace)",
      fontSize: 12,
      letterSpacing: "0.16em",
      color: "red",
    });
  });

  it.each(LABS)("%s writes nothing under 12px", (file) => {
    const sizes = Array.from(source(file).matchAll(/fontSize: (\d+(?:\.\d+)?)\b/gu), (m) =>
      Number(m[1]),
    );
    expect(sizes.filter((size) => size < LAB_LABEL_SIZE)).toEqual([]);
  });

  it.each(["network-lab.css", "photo-osint.css"])("%s writes nothing under 12px", (file) => {
    const sizes = Array.from(source(file).matchAll(/font-size: (\d+(?:\.\d+)?)px/gu), (m) =>
      Number(m[1]),
    );
    expect(sizes.filter((size) => size < LAB_LABEL_SIZE)).toEqual([]);
  });
});
