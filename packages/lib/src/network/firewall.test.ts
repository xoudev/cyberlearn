import { describe, expect, it } from "vitest";
import {
  decide,
  describePacket,
  describeVerdict,
  type Packet,
  parseRules,
  type Ruleset,
  satisfies,
} from "./firewall";

/**
 * The rules of the Linux firewall lesson, read and applied the way netfilter
 * would: in order, first match decides, the policy for the rest. And the
 * mistakes a learner types, each named with its line.
 */

const LESSON = `policy drop
accept established
accept icmp
accept tcp from 192.0.2.0/24 port 22
accept tcp port 80,443
drop tcp port 8080   # test de l'appli`;

function rulesOf(text: string): Ruleset {
  const parsed = parseRules(text);
  if (!parsed.ok) throw new Error(`line ${String(parsed.line)}: ${parsed.problem}`);
  return parsed.ruleset;
}

const tcp = (from: string, port: number, state: Packet["state"] = "new"): Packet => ({
  proto: "tcp",
  from,
  port,
  state,
});

describe("parseRules", () => {
  it("reads the lesson's rule set, comments and blank lines aside", () => {
    const ruleset = rulesOf(`${LESSON}\n\n# fin`);
    expect(ruleset.policy).toBe("drop");
    expect(ruleset.rules.map((r) => r.line)).toEqual([2, 3, 4, 5, 6]);
    expect(ruleset.rules[1]).toMatchObject({ action: "accept", proto: "icmp", ports: null });
    expect(ruleset.rules[2]).toMatchObject({
      action: "accept",
      proto: "tcp",
      from: { prefix: 24 },
      ports: [{ from: 22, to: 22 }],
    });
    expect(ruleset.rules[3]?.ports).toEqual([
      { from: 80, to: 80 },
      { from: 443, to: 443 },
    ]);
    expect(ruleset.rules[4]?.text).toBe("drop tcp port 8080");
  });

  it("accepts ufw's wording, a single address, a port range, upper case", () => {
    const ruleset = rulesOf(
      "Accept TCP from 192.0.2.10 to port 22\nreject udp port 1024-65535 from any",
    );
    expect(ruleset.policy).toBe("accept");
    expect(ruleset.rules[0]).toMatchObject({ from: { prefix: 32 }, ports: [{ from: 22, to: 22 }] });
    expect(ruleset.rules[1]).toMatchObject({
      action: "reject",
      from: null,
      ports: [{ from: 1024, to: 65535 }],
    });
  });

  it("names the line and the mistake, in the learner's words", () => {
    expect(parseRules("allow tcp port 22")).toMatchObject({
      ok: false,
      line: 1,
      problem: expect.stringContaining("je ne connais pas « allow »") as string,
    });
    expect(parseRules("policy drop\naccept tcp from 192.0.2.300/24 port 22")).toMatchObject({
      ok: false,
      line: 2,
      problem: expect.stringContaining("192.0.2.300/24") as string,
    });
    expect(parseRules("accept tcp port 70000")).toMatchObject({
      ok: false,
      problem: expect.stringContaining("70000") as string,
    });
    expect(parseRules("accept icmp port 22")).toMatchObject({
      ok: false,
      problem: expect.stringContaining("icmp n'a pas de port") as string,
    });
    expect(parseRules("policy reject")).toMatchObject({
      ok: false,
      problem: expect.stringContaining("accept ou drop") as string,
    });
    expect(parseRules("policy drop\npolicy accept")).toMatchObject({ ok: false, line: 2 });
    expect(parseRules("accept tcp to 22")).toMatchObject({
      ok: false,
      problem: expect.stringContaining("to port") as string,
    });
    expect(parseRules("accept tcp from")).toMatchObject({ ok: false, line: 1 });
  });

  it("reads an empty text as a firewall that lets everything through", () => {
    expect(rulesOf("")).toEqual({ policy: "accept", rules: [] });
  });
});

describe("decide", () => {
  const ruleset = rulesOf(LESSON);

  it("lets the web and the admin network's SSH in, and jets the rest by policy", () => {
    expect(decide(ruleset, tcp("203.0.113.5", 443))).toEqual({ verdict: "accept", by: 3 });
    expect(decide(ruleset, tcp("192.0.2.10", 22))).toEqual({ verdict: "accept", by: 2 });
    expect(decide(ruleset, tcp("198.51.100.7", 22))).toEqual({ verdict: "drop", by: null });
    expect(decide(ruleset, tcp("198.51.100.7", 5432))).toEqual({ verdict: "drop", by: null });
  });

  it("stops at the first rule that matches, and reads established before the rest", () => {
    expect(decide(ruleset, tcp("198.51.100.7", 8080))).toEqual({ verdict: "drop", by: 4 });
    expect(decide(ruleset, tcp("151.101.0.1", 41000, "established"))).toEqual({
      verdict: "accept",
      by: 0,
    });
    expect(decide(ruleset, { proto: "icmp", from: "198.51.100.7", state: "new" })).toEqual({
      verdict: "accept",
      by: 1,
    });
    expect(decide(ruleset, { proto: "udp", from: "198.51.100.7", port: 53, state: "new" })).toEqual(
      {
        verdict: "drop",
        by: null,
      },
    );
  });

  it("applies an open policy when nothing says otherwise", () => {
    const open = rulesOf("accept tcp port 22");
    expect(decide(open, tcp("198.51.100.7", 5432))).toEqual({ verdict: "accept", by: null });
  });
});

describe("words", () => {
  it("says the packet and the verdict as a learner reads them", () => {
    expect(describePacket(tcp("198.51.100.7", 22))).toBe("tcp depuis 198.51.100.7 vers le port 22");
    expect(describePacket(tcp("151.101.0.1", 41000, "established"))).toBe(
      "tcp depuis 151.101.0.1 vers le port 41000, réponse à une connexion en cours",
    );
    expect(describePacket({ proto: "icmp", from: "192.0.2.10", state: "new" })).toBe(
      "icmp depuis 192.0.2.10",
    );
    expect(describeVerdict("accept")).toBe("accepté");
    expect(describeVerdict("drop")).toBe("jeté sans réponse (drop)");
    expect(describeVerdict("reject")).toBe("rejeté, l'émetteur prévenu (reject)");
  });

  it("counts drop and reject both as blocking", () => {
    expect(satisfies("drop", "block")).toBe(true);
    expect(satisfies("reject", "block")).toBe(true);
    expect(satisfies("accept", "block")).toBe(false);
    expect(satisfies("accept", "accept")).toBe(true);
    expect(satisfies("drop", "accept")).toBe(false);
  });
});
