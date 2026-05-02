export interface TerminalScenario {
  /** Human-readable message shown on terminal mount */
  initialMessage?: string;
  /** Map of command string → simulated output */
  commands: Record<string, string>;
}
export declare const TERMINAL_SCENARIOS: Record<string, TerminalScenario>;
/** Look up a scenario by ID. Returns undefined for unknown IDs (prototype-safe). */
export declare function getTerminalScenario(id: string): TerminalScenario | undefined;
/** All registered scenario IDs. */
export declare const TERMINAL_SCENARIO_IDS: string[];
//# sourceMappingURL=scenarios.d.ts.map
