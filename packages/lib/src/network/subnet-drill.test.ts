import { SUBNET_DRILL_KINDS, type SubnetDrillKind } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import { broadcastOf, maskOf, networkOf, parseCidr, parseIp, sameSubnet } from "./ip";
import {
  type DrillQuestion,
  drawQuestion,
  drawSeries,
  isRightAnswer,
  seededRandom,
} from "./subnet-drill";

/**
 * The questions are read back from their own wording, the way a learner reads
 * them, and their answers are checked against the IPv4 arithmetic of ip.ts: a
 * question whose correction is wrong would teach the wrong thing to everyone.
 */

const ALL = { kinds: [...SUBNET_DRILL_KINDS], prefixes: { min: 24, max: 30 }, count: 9 };
const WIDE = { min: 8, max: 30 };

/** The first a.b.c.d/n of a text. */
function cidrIn(text: string): { address: number; prefix: number } {
  const m = /(\d+\.\d+\.\d+\.\d+\/\d+)/u.exec(text);
  const cidr = m?.[1] === undefined ? null : parseCidr(m[1]);
  if (cidr === null) throw new Error(`no cidr in: ${text}`);
  return cidr;
}

/** Every a.b.c.d of a text, as numbers. */
function addressesIn(text: string): number[] {
  return [...text.matchAll(/\d+\.\d+\.\d+\.\d+/gu)].map((m) => {
    const ip = parseIp(m[0]);
    if (ip === null) throw new Error(`bad address in: ${text}`);
    return ip;
  });
}

const slash = (text: string): number => Number(/\/(\d+)/u.exec(text)?.[1]);

function* draws(kind: SubnetDrillKind, prefixes = WIDE, n = 150): Generator<DrillQuestion> {
  for (let seed = 1; seed <= n; seed++) yield drawQuestion(kind, prefixes, seededRandom(seed));
}

const isPrivate = (ip: number): boolean =>
  networkOf(ip, 8) === 0x0a000000 ||
  networkOf(ip, 12) === 0xac100000 ||
  networkOf(ip, 16) === 0xc0a80000;

describe("drawSeries", () => {
  it("draws the same series for the same seed, another for another", () => {
    const a = drawSeries(ALL, seededRandom(7)).map((q) => q.prompt);
    const b = drawSeries(ALL, seededRandom(7)).map((q) => q.prompt);
    const c = drawSeries(ALL, seededRandom(8)).map((q) => q.prompt);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("takes every kind once before repeating any, in a shuffled order", () => {
    const kinds = drawSeries(ALL, seededRandom(3)).map((q) => q.kind);
    expect([...kinds].sort()).toEqual([...SUBNET_DRILL_KINDS].sort());
    expect(kinds).not.toEqual([...SUBNET_DRILL_KINDS]);
    const longer = drawSeries({ ...ALL, count: 20 }, seededRandom(3)).map((q) => q.kind);
    expect(longer.slice(0, 9)).toEqual(kinds);
    expect(longer.slice(9, 18)).toEqual(kinds);
  });

  it("keeps to the kinds and the prefixes the author chose", () => {
    const series = drawSeries(
      { kinds: ["hosts", "mask"], prefixes: { min: 26, max: 27 }, count: 12 },
      seededRandom(5),
    );
    expect(series.every((q) => q.kind === "hosts" || q.kind === "mask")).toBe(true);
    expect(series.every((q) => q.prefix === 26 || q.prefix === 27)).toBe(true);
    expect(series.map((q) => q.kind)).toContain("hosts");
    expect(series.map((q) => q.kind)).toContain("mask");
  });

  it("leaves cutting a network out when there is a single prefix to draw", () => {
    const series = drawSeries(
      { kinds: ["subnets", "hosts"], prefixes: { min: 24, max: 24 }, count: 6 },
      seededRandom(1),
    );
    expect(series.every((q) => q.kind === "hosts")).toBe(true);
  });
});

describe("the arithmetic of each kind, against ip.ts", () => {
  it("network: the address's network, from a private host address", () => {
    for (const q of draws("network")) {
      const { address, prefix } = cidrIn(q.prompt);
      expect(q.input).toBe("address");
      expect(q.prefix).toBe(prefix);
      expect(parseIp(q.answer)).toBe(networkOf(address, prefix));
      expect(address).not.toBe(networkOf(address, prefix));
      expect(isPrivate(address)).toBe(true);
      expect(q.explanation).toContain(q.answer);
    }
  });

  it("broadcast, first and last host: the bounds of the block", () => {
    for (const q of draws("broadcast")) {
      const { address, prefix } = cidrIn(q.prompt);
      expect(parseIp(q.answer)).toBe(broadcastOf(address, prefix));
    }
    for (const q of draws("first-host")) {
      const { address, prefix } = cidrIn(q.prompt);
      expect(parseIp(q.answer)).toBe(networkOf(address, prefix) + 1);
    }
    for (const q of draws("last-host")) {
      const { address, prefix } = cidrIn(q.prompt);
      expect(parseIp(q.answer)).toBe(broadcastOf(address, prefix) - 1);
    }
  });

  it("hosts: two to the host bits, minus two; a /30 leaves two", () => {
    for (const q of draws("hosts")) {
      const prefix = slash(q.prompt);
      expect(q.input).toBe("number");
      expect(Number(q.answer)).toBe(2 ** (32 - prefix) - 2);
    }
    const q = drawQuestion("hosts", { min: 30, max: 30 }, seededRandom(1));
    expect(q.answer).toBe("2");
    expect(q.explanation).toBe(
      "32 - 30 = 2 bits d'hôte, 2^2 = 4 adresses, moins l'adresse de réseau et la diffusion : 2 hôtes utilisables.",
    );
  });

  it("mask and prefix: the one from the other", () => {
    for (const q of draws("mask")) {
      expect(parseIp(q.answer)).toBe(maskOf(slash(q.prompt)));
    }
    for (const q of draws("prefix")) {
      const [mask] = addressesIn(q.prompt);
      expect(mask).toBe(maskOf(Number(q.answer)));
      expect(q.explanation).toContain(`/${q.answer}`);
    }
  });

  it("same-subnet: a yes-or-no that agrees with the networks, both answers drawn", () => {
    const answers = new Set<string>();
    for (const q of draws("same-subnet", { min: 25, max: 30 })) {
      const [a, b] = addressesIn(q.prompt);
      const prefix = slash(q.prompt);
      if (a === undefined || b === undefined) throw new Error(q.prompt);
      expect(q.choices).toEqual(["Oui", "Non"]);
      expect(q.answer).toBe(sameSubnet(a, b, prefix) ? "Oui" : "Non");
      // The trap of the lesson: same first three octets, different subnets.
      expect(networkOf(a, 24)).toBe(networkOf(b, 24));
      expect(a).not.toBe(b);
      answers.add(q.answer);
    }
    expect([...answers].sort()).toEqual(["Non", "Oui"]);
  });

  it("subnets: two to the bits borrowed, six at most", () => {
    for (const q of draws("subnets")) {
      const { prefix: from } = cidrIn(q.prompt);
      const to = q.prefix;
      expect(to).toBeGreaterThan(from);
      expect(to - from).toBeLessThanOrEqual(6);
      expect(Number(q.answer)).toBe(2 ** (to - from));
    }
  });

  it("stays within the prefixes it is given, whatever the kind", () => {
    for (const kind of SUBNET_DRILL_KINDS) {
      for (const q of draws(kind, { min: 20, max: 22 }, 40)) {
        expect(q.prefix).toBeGreaterThanOrEqual(20);
        expect(q.prefix).toBeLessThanOrEqual(22);
      }
    }
  });
});

describe("the reasoning", () => {
  it("names the block of the octet a prefix cuts, as the lesson does", () => {
    const q = [...draws("network", { min: 26, max: 26 }, 30)].find((d) =>
      d.prompt.includes("192.168."),
    );
    if (q === undefined) throw new Error("no 192.168 question drawn");
    expect(q.explanation).toContain("Le /26 coupe le 4e octet en blocs de 64 (0, 64, 128, 192) :");
    expect(q.explanation).toMatch(/tombe dans le bloc qui commence à (0|64|128|192)\./u);
  });

  it("says a prefix on an octet boundary keeps the first octets whole", () => {
    const q = drawQuestion("network", { min: 24, max: 24 }, seededRandom(2));
    const { address } = cidrIn(q.prompt);
    const kept = [address >>> 24, (address >>> 16) & 255, (address >>> 8) & 255].join(".");
    expect(q.explanation).toContain(
      `Le /24 s'arrête à la fin du 3e octet : on garde ${kept} tel quel et on met le reste à zéro.`,
    );
  });

  it("shortens a long list of blocks, and spaces big numbers the French way", () => {
    const network = drawQuestion("network", { min: 30, max: 30 }, seededRandom(4));
    expect(network.explanation).toContain("en blocs de 4 (0, 4, 8, 12…)");
    const hosts = drawQuestion("hosts", { min: 8, max: 8 }, seededRandom(1));
    expect(hosts.explanation).toContain("2^24 = 16 777 216 adresses");
    expect(hosts.answer).toBe("16777214");
  });
});

describe("isRightAnswer", () => {
  const network = drawQuestion("network", { min: 26, max: 26 }, seededRandom(11));
  const hosts = drawQuestion("hosts", { min: 26, max: 26 }, seededRandom(11));
  const prefix = drawQuestion("prefix", { min: 26, max: 26 }, seededRandom(11));
  const choice = drawQuestion("same-subnet", { min: 26, max: 26 }, seededRandom(11));

  it("reads an address with or without the question's prefix, spaces ignored", () => {
    expect(isRightAnswer(network, network.answer)).toBe(true);
    expect(isRightAnswer(network, ` ${network.answer} /26 `)).toBe(true);
    expect(isRightAnswer(network, `${network.answer}/25`)).toBe(false);
    expect(isRightAnswer(network, `${network.answer}/`)).toBe(false);
    expect(isRightAnswer(network, "192.168.1.300")).toBe(false);
    expect(isRightAnswer(network, "")).toBe(false);
  });

  it("reads a number, and a prefix with its slash", () => {
    expect(isRightAnswer(hosts, "62")).toBe(true);
    expect(isRightAnswer(hosts, " 62 ")).toBe(true);
    expect(isRightAnswer(hosts, "64")).toBe(false);
    expect(isRightAnswer(hosts, "62 hôtes")).toBe(false);
    expect(isRightAnswer(prefix, "26")).toBe(true);
    expect(isRightAnswer(prefix, "/26")).toBe(true);
    expect(isRightAnswer(prefix, "255.255.255.192")).toBe(false);
  });

  it("reads a choice whatever its case", () => {
    expect(isRightAnswer(choice, choice.answer.toUpperCase())).toBe(true);
    expect(isRightAnswer(choice, choice.answer === "Oui" ? "non" : "oui")).toBe(false);
  });
});
