import type { SubnetDrill, SubnetDrillKind } from "@cyberlearn/types";
import { broadcastOf, cidrOf, formatIp, isHostAddress, maskOf, networkOf, parseIp } from "./ip";

/**
 * <SubnetDrill>: IPv4 addressing exercises drawn at random and corrected on
 * the spot. A question asks one thing about an address and a prefix (its
 * network, its broadcast, the first or last host, how many hosts, the mask of
 * a prefix, the prefix of a mask, whether two addresses share a subnet, how
 * many subnets a cut gives). The learner types or picks the answer, and the
 * correction gives the reasoning the lesson teaches: the host bits, two to that
 * power, the block of the octet the address falls in.
 *
 * Pure, and deterministic for a given generator: the site and the app draw the
 * same way, and the tests draw with a seed. Addresses come from the RFC 1918
 * ranges the lessons use, so a question reads like the network at home.
 */

export type Rng = () => number;

export interface DrillQuestion {
  readonly kind: SubnetDrillKind;
  /** What is asked, in French. */
  readonly prompt: string;
  /** How the learner answers: an address typed, a number typed, or one of `choices`. */
  readonly input: "address" | "number" | "choice";
  readonly choices: readonly string[];
  /** The answer, as the correction shows it. */
  readonly answer: string;
  /** The prefix at play, so an address typed with its prefix can be checked. */
  readonly prefix: number;
  /** The reasoning, shown with the correction. */
  readonly explanation: string;
}

type Prefixes = SubnetDrill["prefixes"];

/** mulberry32: a small generator, the same sequence everywhere for a seed. */
export function seededRandom(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Family {
  readonly base: number;
  readonly prefix: number;
}

/** The RFC 1918 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. */
const FAMILIES: readonly Family[] = [
  { base: 0x0a000000, prefix: 8 },
  { base: 0xac100000, prefix: 12 },
  { base: 0xc0a80000, prefix: 16 },
];

const ORDINALS = ["1er", "2e", "3e", "4e"];

const int = (rng: Rng, n: number): number => Math.floor(rng() * n);
const between = (rng: Rng, min: number, max: number): number => min + int(rng, max - min + 1);

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = int(rng, i + 1);
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/** A number with its thousands spaced, as French writes it: 16 777 216. */
function fr(n: number): string {
  const digits = String(n);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += " ";
    out += digits.charAt(i);
  }
  return out;
}

const octets = (n: number): number[] => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];

const binary = (n: number): string =>
  octets(n)
    .map((o) => o.toString(2).padStart(8, "0"))
    .join(".");

const ordinal = (i: number): string => ORDINALS[i] ?? `${String(i + 1)}e`;

/**
 * The ranges a question at `prefix` can be drawn in without crossing out of
 * them; with `twoBlocks`, those a prefix cuts in at least two subnets. 10/8
 * when none qualifies (a /8 question).
 */
function familiesFor(prefix: number, twoBlocks: boolean): readonly Family[] {
  const fitting = FAMILIES.filter((f) => (twoBlocks ? f.prefix < prefix : f.prefix <= prefix));
  return fitting.length > 0 ? fitting : FAMILIES.slice(0, 1);
}

function randomIn(family: Family, rng: Rng): number {
  return (family.base + int(rng, 2 ** (32 - family.prefix))) >>> 0;
}

/** A host address (neither a network's nor a broadcast's) of a private range. */
function drawHost(
  rng: Rng,
  prefix: number,
  twoBlocks = false,
): { family: Family; address: number } {
  const candidates = familiesFor(prefix, twoBlocks);
  const family = candidates[int(rng, candidates.length)] ?? FAMILIES[0];
  if (family === undefined) throw new Error("no address family");
  for (let i = 0; i < 16; i++) {
    const address = randomIn(family, rng);
    if (isHostAddress(address, prefix)) return { family, address };
  }
  return { family, address: (networkOf(randomIn(family, rng), prefix) + 1) >>> 0 };
}

/** Where the prefix cuts, and the block of that octet the address falls in. */
function blockReasoning(address: number, prefix: number): string {
  if (prefix % 8 === 0) {
    const kept = octets(address)
      .slice(0, prefix / 8)
      .join(".");
    return `Le /${String(prefix)} s'arrête à la fin du ${ordinal(prefix / 8 - 1)} octet : on garde ${kept} tel quel et on met le reste à zéro.`;
  }
  const i = Math.floor(prefix / 8);
  const step = 2 ** (8 - (prefix % 8));
  const value = octets(address)[i] ?? 0;
  const start = octets(networkOf(address, prefix))[i] ?? 0;
  const starts: number[] = [];
  for (let s = 0; s < 256 && starts.length < 4; s += step) starts.push(s);
  const list = `${starts.join(", ")}${256 / step > 4 ? "…" : ""}`;
  return `Le /${String(prefix)} coupe le ${ordinal(i)} octet en blocs de ${String(step)} (${list}) : ${String(value)} tombe dans le bloc qui commence à ${String(start)}.`;
}

function sizeReasoning(prefix: number): string {
  const hostBits = 32 - prefix;
  return `32 - ${String(prefix)} = ${String(hostBits)} bits d'hôte, 2^${String(hostBits)} = ${fr(2 ** hostBits)} adresses`;
}

const typed = (
  kind: SubnetDrillKind,
  input: "address" | "number",
  prefix: number,
  prompt: string,
  answer: string,
  explanation: string,
): DrillQuestion => ({ kind, prompt, input, choices: [], answer, prefix, explanation });

/** One question of the given kind, its prefix drawn within `prefixes`. */
export function drawQuestion(kind: SubnetDrillKind, prefixes: Prefixes, rng: Rng): DrillQuestion {
  const prefix = between(rng, prefixes.min, prefixes.max);
  const total = 2 ** (32 - prefix);
  switch (kind) {
    case "network": {
      const { address } = drawHost(rng, prefix);
      const network = formatIp(networkOf(address, prefix));
      return typed(
        kind,
        "address",
        prefix,
        `Quelle est l'adresse de réseau de ${cidrOf(address, prefix)} ?`,
        network,
        `${blockReasoning(address, prefix)} L'adresse de réseau est ${network}.`,
      );
    }
    case "broadcast": {
      const { address } = drawHost(rng, prefix);
      const network = formatIp(networkOf(address, prefix));
      const broadcast = formatIp(broadcastOf(address, prefix));
      return typed(
        kind,
        "address",
        prefix,
        `Quelle est l'adresse de diffusion du sous-réseau de ${cidrOf(address, prefix)} ?`,
        broadcast,
        `${blockReasoning(address, prefix)} Le bloc va de ${network} à ${broadcast} (${fr(total)} adresses) : la diffusion est la dernière, ${broadcast}.`,
      );
    }
    case "first-host": {
      const { address } = drawHost(rng, prefix);
      const network = networkOf(address, prefix);
      const first = formatIp((network + 1) >>> 0);
      return typed(
        kind,
        "address",
        prefix,
        `Quel est le premier hôte utilisable du sous-réseau de ${cidrOf(address, prefix)} ?`,
        first,
        `${blockReasoning(address, prefix)} L'adresse de réseau, ${formatIp(network)}, n'est pas attribuable : le premier hôte vient juste après, ${first}.`,
      );
    }
    case "last-host": {
      const { address } = drawHost(rng, prefix);
      const broadcast = broadcastOf(address, prefix);
      const last = formatIp(broadcast - 1);
      return typed(
        kind,
        "address",
        prefix,
        `Quel est le dernier hôte utilisable du sous-réseau de ${cidrOf(address, prefix)} ?`,
        last,
        `${blockReasoning(address, prefix)} Le bloc finit à ${formatIp(broadcast)}, la diffusion, qui n'est pas attribuable : le dernier hôte est juste avant, ${last}.`,
      );
    }
    case "hosts":
      return typed(
        kind,
        "number",
        prefix,
        `Combien d'hôtes utilisables contient un sous-réseau en /${String(prefix)} ?`,
        String(total - 2),
        `${sizeReasoning(prefix)}, moins l'adresse de réseau et la diffusion : ${fr(total - 2)} hôtes utilisables.`,
      );
    case "mask": {
      const mask = formatIp(maskOf(prefix));
      return typed(
        kind,
        "address",
        prefix,
        `Quel est le masque de sous-réseau d'un /${String(prefix)}, en notation décimale pointée ?`,
        mask,
        `${String(prefix)} bits à 1 puis ${String(32 - prefix)} bits à 0 : ${binary(maskOf(prefix))}, soit ${mask}.`,
      );
    }
    case "prefix": {
      const mask = formatIp(maskOf(prefix));
      return typed(
        kind,
        "number",
        prefix,
        `Quel préfixe CIDR correspond au masque ${mask} ?`,
        String(prefix),
        `${mask} s'écrit ${binary(maskOf(prefix))} : ${String(prefix)} bits à 1, donc /${String(prefix)}.`,
      );
    }
    case "same-subnet": {
      const { family, address: a } = drawHost(rng, prefix, true);
      const network = networkOf(a, prefix);
      const same = rng() < 0.5;
      const hosts = total - 2;
      let b: number;
      if (same) {
        let h = 1 + int(rng, hosts);
        if (network + h === a) h = 1 + (h % hosts);
        b = (network + h) >>> 0;
      } else {
        // The block next door, within the same octet when the prefix cuts
        // one: the two addresses then share their first octets, which is the
        // trap the lesson warns about. Within the private range in any case.
        const parent = prefix - (prefix % 8 === 0 ? 8 : prefix % 8);
        const end = family.base + 2 ** (32 - family.prefix);
        const inside = (n: number): boolean =>
          n >= family.base && n < end && networkOf(n, parent) === networkOf(network, parent);
        const down = network - total;
        const up = network + total;
        const fitting = [down, up].filter(inside);
        const neighbour = fitting[int(rng, fitting.length)] ?? (down >= family.base ? down : up);
        b = (neighbour + 1 + int(rng, hosts)) >>> 0;
      }
      const here = cidrOf(network, prefix);
      return {
        kind,
        prompt: `Avec un masque /${String(prefix)}, ${formatIp(a)} et ${formatIp(b)} sont-elles dans le même sous-réseau ?`,
        input: "choice",
        choices: ["Oui", "Non"],
        answer: same ? "Oui" : "Non",
        prefix,
        explanation: same
          ? `En /${String(prefix)}, les deux adresses sont dans ${here} : elles se parlent directement, sans routeur.`
          : `En /${String(prefix)}, ${formatIp(a)} est dans ${here} et ${formatIp(b)} dans ${cidrOf(networkOf(b, prefix), prefix)} : deux sous-réseaux différents, il faut un routeur entre elles.`,
      };
    }
    case "subnets": {
      // Two prefixes of the range, at most six bits apart: a few dozen subnets, not millions.
      const from = between(rng, prefixes.min, Math.max(prefixes.min, prefixes.max - 1));
      const to = between(rng, from + 1, Math.max(from + 1, Math.min(prefixes.max, from + 6)));
      const { address } = drawHost(rng, from);
      const bits = to - from;
      const count = 2 ** bits;
      return typed(
        kind,
        "number",
        to,
        `En découpant ${cidrOf(networkOf(address, from), from)} en sous-réseaux /${String(to)}, combien en obtient-on ?`,
        String(count),
        `Passer de /${String(from)} à /${String(to)} emprunte ${String(bits)} bit${bits > 1 ? "s" : ""} à la partie hôte : 2^${String(bits)} = ${fr(count)} sous-réseaux de ${fr(2 ** (32 - to))} adresses chacun.`,
      );
    }
  }
}

/**
 * A series: `count` questions, the kinds shuffled once then taken in turn, so
 * a short series still varies. Cutting a network needs two prefixes: with one,
 * that kind is left out.
 */
export function drawSeries(
  drill: Pick<SubnetDrill, "kinds" | "prefixes" | "count">,
  rng: Rng,
): DrillQuestion[] {
  const kinds = drill.kinds.filter(
    (kind) => kind !== "subnets" || drill.prefixes.min < drill.prefixes.max,
  );
  const pool: SubnetDrillKind[] = kinds.length > 0 ? kinds : ["hosts"];
  const order = shuffled(pool, rng);
  return Array.from({ length: drill.count }, (_, i) =>
    drawQuestion(order[i % order.length] ?? "hosts", drill.prefixes, rng),
  );
}

/**
 * Whether what the learner typed is the answer. Spaces are ignored; an address
 * may carry the question's prefix (192.168.1.64/26) and a prefix its slash
 * (/26); the choices are read whatever their case.
 */
export function isRightAnswer(question: DrillQuestion, typed: string): boolean {
  const text = typed.replace(/\s+/gu, "");
  switch (question.input) {
    case "choice":
      return text.toLowerCase() === question.answer.toLowerCase();
    case "number": {
      const digits = text.startsWith("/") ? text.slice(1) : text;
      return /^\d{1,10}$/u.test(digits) && Number(digits) === Number(question.answer);
    }
    case "address": {
      const [ip = "", prefix, ...more] = text.split("/");
      if (more.length > 0) return false;
      if (prefix !== undefined && (prefix === "" || Number(prefix) !== question.prefix))
        return false;
      const given = parseIp(ip);
      return given !== null && given === parseIp(question.answer);
    }
  }
}
