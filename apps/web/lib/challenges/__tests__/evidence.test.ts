import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { attachmentEvidence, machineEvidence } from "../evidence";

/**
 * A glimpse of a challenge's machine, for its card: what `ls` shows and the
 * first lines of the biggest file. Never a hidden name, never a flag line.
 */

const CHALLENGES = path.resolve(__dirname, "../../../../../content/challenges");

describe("machineEvidence", () => {
  it("lists what `ls` shows, folders marked, hidden names left out", () => {
    const evidence = machineEvidence({
      title: "Le poste",
      files: {
        "projets/notes.txt": "a\n",
        "projets/.archive/secret.txt": "Code : {{FLAG}}\n",
        "projets/site/index.html": "<h1>x</h1>\n",
        "LISEZMOI.txt": "Bonjour\n",
        ".bashrc": "alias ll='ls -l'\n",
      },
    });
    expect(evidence?.listing).toEqual([
      { kind: "cmd", text: "ls" },
      { kind: "out", text: "LISEZMOI.txt  projets/" },
      { kind: "cmd", text: "ls projets/" },
      { kind: "out", text: "notes.txt  site/" },
    ]);
  });

  it("quotes the biggest visible file, without a line holding a placeholder", () => {
    const evidence = machineEvidence({
      files: {
        "LISEZMOI.txt": "court\n",
        "logs/auth.log": "ligne 1\n\nligne 2 {{FLAG_BASE64}}\nligne 3\nligne 4\nligne 5\n",
        ".cache/enorme.txt": "x".repeat(5000),
      },
    });
    expect(evidence?.excerpt).toEqual({
      file: "logs/auth.log",
      lines: ["ligne 1", "ligne 3", "ligne 4"],
    });
  });

  it("gives nothing for a machine it cannot read", () => {
    expect(machineEvidence(null)).toBeNull();
    expect(machineEvidence({ files: {} })).toBeNull();
    expect(machineEvidence("pas une machine")).toBeNull();
  });

  it("never shows a hidden name or a flag from the repository's challenges", () => {
    const files = readdirSync(CHALLENGES).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const raw: unknown = JSON.parse(readFileSync(path.join(CHALLENGES, file), "utf8"));
      const machine =
        typeof raw === "object" && raw !== null && "machine" in raw ? raw.machine : null;
      const evidence = machineEvidence(machine);
      expect(evidence, file).not.toBeNull();
      const text = JSON.stringify(evidence);
      expect(text, file).not.toContain("{{");
      expect(text, file).not.toMatch(/(^|[\s"/])\.[A-Za-z]/u);
    }
  });
});

describe("attachmentEvidence", () => {
  it("names the file to download, as `ls` would", () => {
    expect(attachmentEvidence("https://x.example/files/capture%20reseau.pcap").listing).toEqual([
      { kind: "cmd", text: "ls ~/Téléchargements" },
      { kind: "out", text: "capture reseau.pcap" },
    ]);
  });
});
