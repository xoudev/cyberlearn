"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scenarios_js_1 = require("../scenarios.js");
(0, vitest_1.describe)("TERMINAL_SCENARIOS", () => {
  (0, vitest_1.it)("contains the 4 required scenario IDs", () => {
    (0, vitest_1.expect)(scenarios_js_1.TERMINAL_SCENARIO_IDS).toContain("nmap-basic");
    (0, vitest_1.expect)(scenarios_js_1.TERMINAL_SCENARIO_IDS).toContain("sqli-basic");
    (0, vitest_1.expect)(scenarios_js_1.TERMINAL_SCENARIO_IDS).toContain("file-recon");
    (0, vitest_1.expect)(scenarios_js_1.TERMINAL_SCENARIO_IDS).toContain("network-recon");
  });
  (0, vitest_1.it)("every scenario has at least one command", () => {
    for (const [id, scenario] of Object.entries(scenarios_js_1.TERMINAL_SCENARIOS)) {
      (0, vitest_1.expect)(
        Object.keys(scenario.commands).length,
        `scenario "${id}" must have ≥1 command`,
      ).toBeGreaterThan(0);
    }
  });
  (0, vitest_1.it)("every command produces a non-empty string output", () => {
    for (const [scenarioId, scenario] of Object.entries(scenarios_js_1.TERMINAL_SCENARIOS)) {
      for (const [cmd, output] of Object.entries(scenario.commands)) {
        (0, vitest_1.expect)(
          typeof output === "string" && output.length > 0,
          `scenario "${scenarioId}" command "${cmd}" must have non-empty output`,
        ).toBe(true);
      }
    }
  });
  (0, vitest_1.it)("command outputs are strings (no objects/arrays)", () => {
    for (const [, scenario] of Object.entries(scenarios_js_1.TERMINAL_SCENARIOS)) {
      for (const [, output] of Object.entries(scenario.commands)) {
        (0, vitest_1.expect)(typeof output).toBe("string");
      }
    }
  });
});
(0, vitest_1.describe)("getTerminalScenario", () => {
  (0, vitest_1.it)("returns the correct scenario for known IDs", () => {
    const nmap = (0, scenarios_js_1.getTerminalScenario)("nmap-basic");
    (0, vitest_1.expect)(nmap).toBeDefined();
    (0, vitest_1.expect)(nmap?.commands).toBeDefined();
  });
  (0, vitest_1.it)("returns undefined for unknown IDs", () => {
    (0, vitest_1.expect)(
      (0, scenarios_js_1.getTerminalScenario)("unknown-scenario"),
    ).toBeUndefined();
    (0, vitest_1.expect)((0, scenarios_js_1.getTerminalScenario)("")).toBeUndefined();
    (0, vitest_1.expect)((0, scenarios_js_1.getTerminalScenario)("__proto__")).toBeUndefined();
  });
  (0, vitest_1.it)("nmap-basic includes nmap -sV command", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("nmap-basic");
    (0, vitest_1.expect)(scenario?.commands["nmap -sV 192.168.1.100"]).toBeDefined();
  });
  (0, vitest_1.it)("nmap-basic includes nmap -p command", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("nmap-basic");
    (0, vitest_1.expect)(scenario?.commands["nmap -p 80 192.168.1.100"]).toBeDefined();
  });
  (0, vitest_1.it)("nmap-basic includes nmap -A command", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("nmap-basic");
    (0, vitest_1.expect)(scenario?.commands["nmap -A 192.168.1.100"]).toBeDefined();
  });
  (0, vitest_1.it)("sqli-basic includes sqlmap --dbs command", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("sqli-basic");
    const hasDbs = Object.keys(scenario?.commands ?? {}).some((cmd) => cmd.includes("--dbs"));
    (0, vitest_1.expect)(hasDbs).toBe(true);
  });
  (0, vitest_1.it)("sqli-basic includes sqlmap --tables command", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("sqli-basic");
    const hasTables = Object.keys(scenario?.commands ?? {}).some((cmd) => cmd.includes("--tables"));
    (0, vitest_1.expect)(hasTables).toBe(true);
  });
  (0, vitest_1.it)("file-recon includes ls, cat, find, whoami commands", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("file-recon");
    const cmds = Object.keys(scenario?.commands ?? {});
    (0, vitest_1.expect)(cmds).toContain("ls");
    (0, vitest_1.expect)(cmds.some((c) => c.startsWith("cat"))).toBe(true);
    (0, vitest_1.expect)(cmds.some((c) => c.startsWith("find"))).toBe(true);
    (0, vitest_1.expect)(cmds).toContain("whoami");
  });
  (0, vitest_1.it)("network-recon includes ping, traceroute, netstat, ss commands", () => {
    const scenario = (0, scenarios_js_1.getTerminalScenario)("network-recon");
    const cmds = Object.keys(scenario?.commands ?? {});
    (0, vitest_1.expect)(cmds.some((c) => c.startsWith("ping"))).toBe(true);
    (0, vitest_1.expect)(cmds.some((c) => c.startsWith("traceroute"))).toBe(true);
    (0, vitest_1.expect)(cmds.some((c) => c.startsWith("netstat"))).toBe(true);
    (0, vitest_1.expect)(cmds.some((c) => c.startsWith("ss"))).toBe(true);
  });
  (0, vitest_1.it)("scenarios with initialMessage have non-empty string", () => {
    for (const scenario of Object.values(scenarios_js_1.TERMINAL_SCENARIOS)) {
      if (scenario.initialMessage !== undefined) {
        (0, vitest_1.expect)(scenario.initialMessage.length).toBeGreaterThan(0);
      }
    }
  });
});
//# sourceMappingURL=scenarios.test.js.map
