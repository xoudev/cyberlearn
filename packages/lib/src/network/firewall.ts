import { type Cidr, inSubnet, parseCidr, parseIp } from "./ip";

/**
 * <FirewallLab>: a host firewall on its input chain, written as rules in a
 * small language close to ufw's, and test packets that go through it. A rule
 * set is read in order, the first rule that matches decides, and the policy
 * decides what no rule did: the same model as netfilter, without the rest of
 * nftables. Pure: the site and the app read and decide alike.
 *
 *   policy drop
 *   accept established
 *   accept tcp from 192.0.2.0/24 port 22
 *   accept tcp port 80,443
 *   drop tcp port 8080
 */

export type Verdict = "accept" | "drop" | "reject";
export type Protocol = "tcp" | "udp" | "icmp";

export interface PortRange {
  readonly from: number;
  readonly to: number;
}

export interface FirewallRule {
  readonly action: Verdict;
  readonly proto: Protocol | "any";
  /** The source network, or null for any. */
  readonly from: Cidr | null;
  /** The destination ports, or null for any. */
  readonly ports: readonly PortRange[] | null;
  /** Only the packets of a connection already accepted. */
  readonly established: boolean;
  /** Where it was written, counted from 1. */
  readonly line: number;
  readonly text: string;
}

export interface Ruleset {
  /** What happens to a packet no rule decided. */
  readonly policy: "accept" | "drop";
  readonly rules: readonly FirewallRule[];
}

export type ParsedRules =
  | { ok: true; ruleset: Ruleset }
  | { ok: false; line: number; problem: string };

export interface Packet {
  readonly proto: Protocol;
  readonly from: string;
  readonly port?: number;
  readonly state: "new" | "established";
}

export interface Decision {
  readonly verdict: Verdict;
  /** The index of the rule that decided, or null when the policy did. */
  readonly by: number | null;
}

/** The syntax, as the lab shows it under "Comment écrire une règle". */
export const RULE_SYNTAX: readonly string[] = [
  "policy accept | policy drop : ce qui arrive aux paquets qu'aucune règle n'a tranchés",
  "accept | drop | reject, puis au choix : tcp | udp | icmp, from ADRESSE ou RÉSEAU/n, port N (ou 80,443 ou 1024-65535), established",
  "Les règles sont lues dans l'ordre : la première qui correspond décide.",
  "# commence un commentaire",
];

const ACTIONS = new Set<string>(["accept", "drop", "reject"]);
const PROTOCOLS = new Set<string>(["tcp", "udp", "icmp"]);

function parsePorts(text: string): PortRange[] | null {
  const ranges: PortRange[] = [];
  for (const part of text.split(",")) {
    const m = /^(\d{1,5})(?:-(\d{1,5}))?$/u.exec(part.trim());
    if (!m) return null;
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (from > 65535 || to > 65535 || from > to) return null;
    ranges.push({ from, to });
  }
  return ranges.length > 0 ? ranges : null;
}

function parseSource(text: string): Cidr | null {
  if (text.includes("/")) return parseCidr(text);
  const address = parseIp(text);
  return address === null ? null : { address, prefix: 32 };
}

function parseRuleLine(words: string[], line: number, text: string): FirewallRule | string {
  const [first, ...rest] = words;
  if (first === undefined || !ACTIONS.has(first)) {
    return `je ne connais pas « ${first ?? ""} ». Une règle commence par accept, drop ou reject ; la politique par policy.`;
  }
  // SAFETY: ACTIONS holds the three verdicts only.
  const action = first as Verdict;
  let proto: Protocol | "any" = "any";
  let from: Cidr | null = null;
  let ports: PortRange[] | null = null;
  let established = false;
  let protoSeen = false;
  for (let i = 0; i < rest.length; i++) {
    const word = rest[i] ?? "";
    if (PROTOCOLS.has(word)) {
      if (protoSeen) return "un seul protocole par règle.";
      protoSeen = true;
      // SAFETY: PROTOCOLS holds the three protocols only.
      proto = word as Protocol;
    } else if (word === "from") {
      const value = rest[++i];
      if (value === undefined)
        return "from attend une adresse (192.0.2.10) ou un réseau (192.0.2.0/24).";
      if (from !== null) return "un seul from par règle.";
      if (value !== "any") {
        from = parseSource(value);
        if (from === null)
          return `« ${value} » n'est pas une adresse (a.b.c.d) ni un réseau (a.b.c.d/n).`;
      }
    } else if (word === "to") {
      if (rest[i + 1] !== "port") return "après to, écris port : « to port 22 ».";
    } else if (word === "port") {
      const value = rest[++i];
      if (value === undefined)
        return "port attend un numéro (22), une liste (80,443) ou une plage (1024-65535).";
      if (ports !== null) return "un seul port par règle ; une liste s'écrit 80,443.";
      if (value !== "any") {
        ports = parsePorts(value);
        if (ports === null)
          return `« ${value} » n'est pas un port : un numéro de 0 à 65535, une liste 80,443 ou une plage 1024-65535.`;
      }
    } else if (word === "established") {
      established = true;
    } else {
      return `je ne connais pas « ${word} ». Après le verdict viennent tcp, udp ou icmp, from, port, established.`;
    }
  }
  if (proto === "icmp" && ports !== null)
    return "icmp n'a pas de port : retire port de cette règle.";
  return { action, proto, from, ports, established, line, text };
}

/** The rules as written, or the first line that could not be read and why. */
export function parseRules(text: string): ParsedRules {
  const rules: FirewallRule[] = [];
  let policy: "accept" | "drop" | null = null;
  const lines = text.replace(/\r\n/gu, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? "";
    const trimmed = raw.replace(/#.*$/u, "").trim();
    if (trimmed === "") continue;
    const words = trimmed.toLowerCase().split(/\s+/u);
    const line = i + 1;
    if (words[0] === "policy") {
      if (policy !== null) return { ok: false, line, problem: "la politique s'écrit une fois." };
      const value = words[1];
      if (words.length !== 2 || (value !== "accept" && value !== "drop")) {
        return { ok: false, line, problem: "la politique est accept ou drop : « policy drop »." };
      }
      policy = value;
      continue;
    }
    const rule = parseRuleLine(words, line, trimmed);
    if (typeof rule === "string") return { ok: false, line, problem: rule };
    rules.push(rule);
  }
  return { ok: true, ruleset: { policy: policy ?? "accept", rules } };
}

function matches(rule: FirewallRule, packet: Packet): boolean {
  if (rule.proto !== "any" && rule.proto !== packet.proto) return false;
  if (rule.established && packet.state !== "established") return false;
  if (rule.from !== null) {
    const address = parseIp(packet.from);
    if (address === null || !inSubnet(address, rule.from.address, rule.from.prefix)) return false;
  }
  if (rule.ports !== null) {
    const port = packet.port;
    if (port === undefined || !rule.ports.some((r) => port >= r.from && port <= r.to)) return false;
  }
  return true;
}

/** What the firewall does with the packet: the first matching rule, else the policy. */
export function decide(ruleset: Ruleset, packet: Packet): Decision {
  const index = ruleset.rules.findIndex((rule) => matches(rule, packet));
  if (index === -1) return { verdict: ruleset.policy, by: null };
  return { verdict: ruleset.rules[index]?.action ?? ruleset.policy, by: index };
}

/** The packet in words: "tcp depuis 198.51.100.7 vers le port 22". */
export function describePacket(packet: Packet): string {
  const port = packet.port === undefined ? "" : ` vers le port ${String(packet.port)}`;
  const state = packet.state === "established" ? ", réponse à une connexion en cours" : "";
  return `${packet.proto} depuis ${packet.from}${port}${state}`;
}

/** The verdict in words. */
export function describeVerdict(verdict: Verdict): string {
  switch (verdict) {
    case "accept":
      return "accepté";
    case "drop":
      return "jeté sans réponse (drop)";
    case "reject":
      return "rejeté, l'émetteur prévenu (reject)";
  }
}

/** Whether the verdict is what the lesson expects: "block" is satisfied by drop or reject. */
export function satisfies(verdict: Verdict, expected: "accept" | "block"): boolean {
  return expected === "accept" ? verdict === "accept" : verdict !== "accept";
}
