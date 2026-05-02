import { describe, it, expect } from "vitest";
import { TERMINAL_SCENARIOS, TERMINAL_SCENARIO_IDS, getTerminalScenario } from "../scenarios.js";

describe("TERMINAL_SCENARIOS", () => {
  it("contains the 4 required scenario IDs", () => {
    expect(TERMINAL_SCENARIO_IDS).toContain("nmap-basic");
    expect(TERMINAL_SCENARIO_IDS).toContain("sqli-basic");
    expect(TERMINAL_SCENARIO_IDS).toContain("file-recon");
    expect(TERMINAL_SCENARIO_IDS).toContain("network-recon");
  });

  it("every scenario has at least one command", () => {
    for (const [id, scenario] of Object.entries(TERMINAL_SCENARIOS)) {
      expect(
        Object.keys(scenario.commands).length,
        `scenario "${id}" must have ≥1 command`,
      ).toBeGreaterThan(0);
    }
  });

  it("every command produces a non-empty string output", () => {
    for (const [scenarioId, scenario] of Object.entries(TERMINAL_SCENARIOS)) {
      for (const [cmd, output] of Object.entries(scenario.commands)) {
        expect(
          typeof output === "string" && output.length > 0,
          `scenario "${scenarioId}" command "${cmd}" must have non-empty output`,
        ).toBe(true);
      }
    }
  });

  it("command outputs are strings (no objects/arrays)", () => {
    for (const [, scenario] of Object.entries(TERMINAL_SCENARIOS)) {
      for (const [, output] of Object.entries(scenario.commands)) {
        expect(typeof output).toBe("string");
      }
    }
  });
});

describe("getTerminalScenario", () => {
  it("returns the correct scenario for known IDs", () => {
    const nmap = getTerminalScenario("nmap-basic");
    expect(nmap).toBeDefined();
    expect(nmap?.commands).toBeDefined();
  });

  it("returns undefined for unknown IDs", () => {
    expect(getTerminalScenario("unknown-scenario")).toBeUndefined();
    expect(getTerminalScenario("")).toBeUndefined();
    expect(getTerminalScenario("__proto__")).toBeUndefined();
  });

  it("nmap-basic includes nmap -sV command", () => {
    const scenario = getTerminalScenario("nmap-basic");
    expect(scenario?.commands["nmap -sV 192.168.1.100"]).toBeDefined();
  });

  it("nmap-basic includes nmap -p command", () => {
    const scenario = getTerminalScenario("nmap-basic");
    expect(scenario?.commands["nmap -p 80 192.168.1.100"]).toBeDefined();
  });

  it("nmap-basic includes nmap -A command", () => {
    const scenario = getTerminalScenario("nmap-basic");
    expect(scenario?.commands["nmap -A 192.168.1.100"]).toBeDefined();
  });

  it("sqli-basic includes sqlmap --dbs command", () => {
    const scenario = getTerminalScenario("sqli-basic");
    const hasDbs = Object.keys(scenario?.commands ?? {}).some((cmd) => cmd.includes("--dbs"));
    expect(hasDbs).toBe(true);
  });

  it("sqli-basic includes sqlmap --tables command", () => {
    const scenario = getTerminalScenario("sqli-basic");
    const hasTables = Object.keys(scenario?.commands ?? {}).some((cmd) => cmd.includes("--tables"));
    expect(hasTables).toBe(true);
  });

  it("file-recon includes ls, cat, find, whoami commands", () => {
    const scenario = getTerminalScenario("file-recon");
    const cmds = Object.keys(scenario?.commands ?? {});
    expect(cmds).toContain("ls");
    expect(cmds.some((c) => c.startsWith("cat"))).toBe(true);
    expect(cmds.some((c) => c.startsWith("find"))).toBe(true);
    expect(cmds).toContain("whoami");
  });

  it("network-recon includes ping, traceroute, netstat, ss commands", () => {
    const scenario = getTerminalScenario("network-recon");
    const cmds = Object.keys(scenario?.commands ?? {});
    expect(cmds.some((c) => c.startsWith("ping"))).toBe(true);
    expect(cmds.some((c) => c.startsWith("traceroute"))).toBe(true);
    expect(cmds.some((c) => c.startsWith("netstat"))).toBe(true);
    expect(cmds.some((c) => c.startsWith("ss"))).toBe(true);
  });

  it("scenarios with initialMessage have non-empty string", () => {
    for (const scenario of Object.values(TERMINAL_SCENARIOS)) {
      if (scenario.initialMessage !== undefined) {
        expect(scenario.initialMessage.length).toBeGreaterThan(0);
      }
    }
  });
});
