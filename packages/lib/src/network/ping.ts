import { formatIp, inSubnet, parseIp, sameSubnet, subnetOf } from "./ip";
import {
  type Address,
  type Device,
  deviceByName,
  type Network,
  type Port,
  PORTS,
  peerOf,
} from "./topology";

/**
 * A ping, as the devices of a <NetworkLab> would carry it: the source looks
 * at its own subnet or hands the packet to its gateway, each router looks up
 * its table and passes it on, the destination answers, and the answer must
 * find its own way back. What ping prints is in English, as a real terminal
 * prints it; what happened at each step is told in French, for the learner.
 */

export type PingReason =
  | "no-address"
  | "bad-target"
  | "net-unreachable"
  | "host-unreachable"
  | "timeout"
  | "ttl-exceeded";

export interface PingStep {
  readonly device: string;
  readonly text: string;
}

export interface PingResult {
  readonly ok: boolean;
  readonly reason: PingReason | null;
  /** The lines ping prints. */
  readonly output: string;
  /** What happened, for the learner. */
  readonly explanation: string;
  readonly steps: readonly PingStep[];
  /** The cables the request went through, for the canvas to light up. */
  readonly links: readonly string[];
}

const START_TTL = 64;
const MAX_HOPS = 70;

// ── Layer 2: who hears whom ───────────────────────────────────────────────────

interface Member {
  readonly device: Device;
  readonly port: string;
  readonly address: Address;
}

/**
 * The segments of the network: the sets of ports that hear each other's
 * frames, cables and switches crossed. A switch joins all its ports.
 */
class Segments {
  private readonly parent = new Map<string, string>();
  private readonly members = new Map<string, Member[]>();
  private readonly neighbours = new Map<string, { key: string; link: string | null }[]>();

  constructor(private readonly network: Network) {
    const join = (a: string, b: string): void => {
      const ra = this.find(a);
      const rb = this.find(b);
      if (ra !== rb) this.parent.set(ra, rb);
    };
    const adjacent = (a: string, b: string, link: string | null): void => {
      this.neighbours.set(a, [...(this.neighbours.get(a) ?? []), { key: b, link }]);
      this.neighbours.set(b, [...(this.neighbours.get(b) ?? []), { key: a, link }]);
    };
    for (const device of network.devices) {
      if (device.kind !== "switch") continue;
      const ports = PORTS.switch;
      for (let i = 1; i < ports.length; i++) {
        const a = key({ device: device.id, port: ports[0] ?? "1" });
        const b = key({ device: device.id, port: ports[i] ?? "1" });
        join(a, b);
        adjacent(a, b, null);
      }
    }
    for (const link of network.links) {
      join(key(link.a), key(link.b));
      adjacent(key(link.a), key(link.b), link.id);
    }
    for (const device of network.devices) {
      for (const [port, address] of Object.entries(device.addresses)) {
        const root = this.find(key({ device: device.id, port }));
        this.members.set(root, [...(this.members.get(root) ?? []), { device, port, address }]);
      }
    }
  }

  private find(k: string): string {
    let root = k;
    while (this.parent.get(root) !== undefined && this.parent.get(root) !== root) {
      root = this.parent.get(root) ?? root;
    }
    return root;
  }

  /** Who answers an ARP request for `ip` sent from `port`: the member holding it. */
  lookup(port: Port, ip: number): Member | null {
    const root = this.find(key(port));
    for (const member of this.members.get(root) ?? []) {
      if (member.address.ip === ip && member.device.id !== port.device) return member;
    }
    return null;
  }

  /** The cables a frame crosses from one port to another, switches in between. */
  path(from: Port, to: Port): string[] {
    const start = key(from);
    const goal = key(to);
    const previous = new Map<string, { from: string; link: string | null }>();
    const queue = [start];
    const seen = new Set([start]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      if (current === goal) break;
      for (const next of this.neighbours.get(current) ?? []) {
        if (seen.has(next.key)) continue;
        seen.add(next.key);
        previous.set(next.key, { from: current, link: next.link });
        queue.push(next.key);
      }
    }
    const links: string[] = [];
    let at = goal;
    while (at !== start) {
      const step = previous.get(at);
      if (!step) return [];
      if (step.link !== null) links.unshift(step.link);
      at = step.from;
    }
    return links;
  }

  isPlugged(port: Port): boolean {
    return peerOf(this.network, port) !== null;
  }
}

function key(port: Port): string {
  return `${port.device}/${port.port}`;
}

// ── Layer 3: one way ──────────────────────────────────────────────────────────

type Trip =
  | {
      readonly arrived: true;
      readonly at: Device;
      readonly routers: number;
      readonly links: string[];
      readonly steps: PingStep[];
    }
  | {
      readonly arrived: false;
      readonly reason: PingReason;
      /** The device that gave up, and the address it speaks from. */
      readonly by: Device;
      readonly byIp: number | null;
      readonly links: string[];
      readonly steps: PingStep[];
      readonly explanation: string;
    };

/** A router's port whose subnet holds `ip`, if any. */
function portFacing(device: Device, ip: number): [string, Address] | null {
  for (const [port, address] of Object.entries(device.addresses)) {
    if (sameSubnet(ip, address.ip, address.prefix)) return [port, address];
  }
  return null;
}

function routeFor(device: Device, dst: number): Device["routes"][number] | null {
  let best: Device["routes"][number] | null = null;
  for (const route of device.routes) {
    if (!inSubnet(dst, route.network, route.prefix)) continue;
    if (best === null || route.prefix > best.prefix) best = route;
  }
  return best;
}

function carry(segments: Segments, from: Device, dst: number): Trip {
  const links: string[] = [];
  const steps: PingStep[] = [];
  const fail = (
    by: Device,
    byIp: number | null,
    reason: PingReason,
    explanation: string,
  ): Trip => ({
    arrived: false,
    reason,
    by,
    byIp,
    links,
    steps,
    explanation,
  });
  const dstText = formatIp(dst);
  let current = from;
  let routers = 0;
  let ttl = START_TTL;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const addressed = Object.entries(current.addresses);
    if (addressed.some(([, a]) => a.ip === dst)) {
      steps.push({ device: current.name, text: `${current.name} : c'est pour moi (${dstText}).` });
      return { arrived: true, at: current, routers, links, steps };
    }
    if (current.kind === "router" && current.id !== from.id) {
      // A router that forwards: one hop, one TTL less. The one that sends the
      // packet sets its TTL and spends none of it.
      routers += 1;
      ttl -= 1;
      if (ttl === 0) {
        steps.push({
          device: current.name,
          text: `${current.name} : le TTL tombe à zéro, je jette le paquet.`,
        });
        return fail(
          current,
          addressed[0]?.[1].ip ?? null,
          "ttl-exceeded",
          `Les routeurs se renvoient le paquet en boucle : ${current.name} l'a jeté quand son TTL est tombé à zéro.`,
        );
      }
    }

    // Where to next: the subnet of one of my ports, a gateway or a route.
    let nextIp: number;
    let port: string;
    let address: Address;
    const facing = portFacing(current, dst);
    if (facing) {
      [port, address] = facing;
      nextIp = dst;
      steps.push({
        device: current.name,
        text:
          current.kind === "router"
            ? `${current.name} : ${dstText} est dans le réseau de ${port} (${subnetOf(address.ip, address.prefix)}), je livre directement.`
            : `${current.name} : ${dstText} est dans mon réseau ${subnetOf(address.ip, address.prefix)}, je demande son adresse MAC (ARP).`,
      });
    } else if (current.kind === "pc") {
      const own = current.addresses.eth0;
      if (own === undefined) {
        return fail(
          current,
          null,
          "no-address",
          `${current.name} n'a pas d'adresse IP : il ne peut rien envoyer.`,
        );
      }
      const mine = subnetOf(own.ip, own.prefix);
      if (current.gateway === null) {
        return fail(
          current,
          own.ip,
          "net-unreachable",
          `${dstText} n'est pas dans le réseau de ${current.name} (${mine}), et ${current.name} n'a pas de passerelle par défaut : il ne sait pas sortir.`,
        );
      }
      if (!sameSubnet(current.gateway, own.ip, own.prefix)) {
        return fail(
          current,
          own.ip,
          "net-unreachable",
          `La passerelle de ${current.name}, ${formatIp(current.gateway)}, n'est pas dans son réseau ${mine} : il ne peut pas la joindre.`,
        );
      }
      port = "eth0";
      address = own;
      nextIp = current.gateway;
      steps.push({
        device: current.name,
        text: `${current.name} : ${dstText} n'est pas dans mon réseau ${mine}, j'envoie à ma passerelle ${formatIp(nextIp)}.`,
      });
    } else {
      const route = routeFor(current, dst);
      const speaks = addressed[0]?.[1].ip ?? null;
      if (route === null) {
        steps.push({
          device: current.name,
          text: `${current.name} : aucune route vers ${dstText}.`,
        });
        return fail(
          current,
          speaks,
          "net-unreachable",
          `${current.name} n'a aucune route vers ${dstText} : ni réseau connecté, ni route statique, ni route par défaut.`,
        );
      }
      const out = portFacing(current, route.via);
      const routeText =
        route.prefix === 0 ? "route par défaut" : `route ${subnetOf(route.network, route.prefix)}`;
      if (out === null) {
        return fail(
          current,
          speaks,
          "net-unreachable",
          `La ${routeText} de ${current.name} passe par ${formatIp(route.via)}, qui n'est dans aucun des réseaux de ses ports.`,
        );
      }
      [port, address] = out;
      nextIp = route.via;
      steps.push({
        device: current.name,
        text: `${current.name} : ${routeText} via ${formatIp(nextIp)}, je passe par ${port}.`,
      });
    }

    // The frame itself: someone on the segment must hold nextIp.
    const here: Port = { device: current.id, port };
    const next = segments.lookup(here, nextIp);
    if (next === null) {
      const what = nextIp === dst ? dstText : `sa passerelle ${formatIp(nextIp)}`;
      const why = segments.isPlugged(here)
        ? `${current.name} a cherché ${what} sur ${port} (ARP) : personne n'a répondu.`
        : `${current.name} n'est câblé à rien sur ${port} : son appel ARP vers ${what} ne part nulle part.`;
      steps.push({ device: current.name, text: why });
      return fail(current, address.ip, "host-unreachable", why);
    }
    links.push(...segments.path(here, { device: next.device.id, port: next.port }));
    if (next.device.kind === "pc" && next.address.ip !== dst) {
      steps.push({
        device: next.device.name,
        text: `${next.device.name} reçoit le paquet, mais c'est un ordinateur, pas un routeur : il ne le fait pas suivre.`,
      });
      return fail(
        next.device,
        next.address.ip,
        "timeout",
        `${current.name} a envoyé le paquet à ${next.device.name}, qui n'est pas un routeur : un ordinateur ne fait pas suivre ce qui n'est pas pour lui.`,
      );
    }
    current = next.device;
  }
  return fail(
    current,
    null,
    "ttl-exceeded",
    "Le paquet a traversé trop de routeurs : il tourne en boucle.",
  );
}

// ── The ping ──────────────────────────────────────────────────────────────────

function statistics(dstText: string, received: 0 | 1, errors: boolean): string {
  const loss = received === 1 ? "0% packet loss" : "100% packet loss";
  const errorText = errors ? "+1 errors, " : "";
  return `--- ${dstText} ping statistics ---\n1 packets transmitted, ${String(received)} received, ${errorText}${loss}, time 0ms`;
}

function header(dstText: string): string {
  return `PING ${dstText} (${dstText}) 56(84) bytes of data.`;
}

function failureOutput(trip: Extract<Trip, { arrived: false }>, dstText: string): string {
  const from = trip.byIp === null ? dstText : formatIp(trip.byIp);
  switch (trip.reason) {
    case "no-address":
    case "net-unreachable":
      if (trip.by.kind === "pc") return "ping: connect: Network is unreachable";
      return `${header(dstText)}\nFrom ${from} icmp_seq=1 Destination Net Unreachable\n\n${statistics(dstText, 0, true)}`;
    case "host-unreachable":
      return `${header(dstText)}\nFrom ${from} icmp_seq=1 Destination Host Unreachable\n\n${statistics(dstText, 0, true)}`;
    case "ttl-exceeded":
      return `${header(dstText)}\nFrom ${from} icmp_seq=1 Time to live exceeded\n\n${statistics(dstText, 0, true)}`;
    case "timeout":
    case "bad-target":
      return `${header(dstText)}\n\n${statistics(dstText, 0, false)}`;
  }
}

/** The address a source speaks from towards `dst`: the port facing it, else its first. */
function sourceAddress(device: Device, dst: number): Address | null {
  const facing = portFacing(device, dst);
  if (facing) return facing[1];
  const route = device.kind === "router" ? routeFor(device, dst) : null;
  const out = route === null ? null : portFacing(device, route.via);
  if (out) return out[1];
  return Object.values(device.addresses)[0] ?? null;
}

/**
 * Pings `target` (an address, or a device's name) from the device named
 * `fromName`. The request goes one way, the answer must come back the other.
 */
export function ping(network: Network, fromName: string, target: string): PingResult {
  const source = deviceByName(network, fromName);
  if (!source || source.kind === "switch") {
    return {
      ok: false,
      reason: "no-address",
      output: "ping: connect: Network is unreachable",
      explanation: source
        ? `${source.name} est un switch : il n'a pas d'adresse IP, il ne peut pas envoyer de ping.`
        : `Aucun appareil ne s'appelle ${fromName}.`,
      steps: [],
      links: [],
    };
  }
  const named = deviceByName(network, target);
  const dst = named ? (Object.values(named.addresses)[0]?.ip ?? null) : parseIp(target);
  if (dst === null) {
    const text = target.trim();
    return {
      ok: false,
      reason: "bad-target",
      output: `ping: ${text}: Name or service not known`,
      explanation: named
        ? `${named.name} n'a pas d'adresse IP : rien à viser.`
        : `${text} n'est ni une adresse IP ni le nom d'un appareil.`,
      steps: [],
      links: [],
    };
  }
  const dstText = formatIp(dst);
  const own = sourceAddress(source, dst);
  if (own === null) {
    return {
      ok: false,
      reason: "no-address",
      output: "ping: connect: Network is unreachable",
      explanation: `${source.name} n'a pas d'adresse IP : il ne peut rien envoyer.`,
      steps: [],
      links: [],
    };
  }
  if (own.ip === dst || Object.values(source.addresses).some((a) => a.ip === dst)) {
    return {
      ok: true,
      reason: null,
      output: `${header(dstText)}\n64 bytes from ${dstText}: icmp_seq=1 ttl=64 time=0.041 ms\n\n${statistics(dstText, 1, false)}`,
      explanation: `${source.name} se ping lui-même : le paquet ne quitte pas la machine.`,
      steps: [{ device: source.name, text: `${source.name} : ${dstText}, c'est moi.` }],
      links: [],
    };
  }

  const request = carry(segments(network), source, dst);
  if (!request.arrived) {
    return {
      ok: false,
      reason: request.reason,
      output: failureOutput(request, dstText),
      explanation: request.explanation,
      steps: request.steps,
      links: request.links,
    };
  }
  const srcText = formatIp(own.ip);
  const back = carry(segments(network), request.at, own.ip);
  const steps = [
    ...request.steps,
    { device: request.at.name, text: `${request.at.name} répond à ${srcText}.` },
    ...back.steps,
  ];
  if (!back.arrived) {
    return {
      ok: false,
      reason: "timeout",
      output: `${header(dstText)}\n\n${statistics(dstText, 0, false)}`,
      explanation: `La requête est arrivée à ${request.at.name}, mais la réponse n'a pas pu revenir. ${back.explanation}`,
      steps,
      links: request.links,
    };
  }
  const ttl = START_TTL - back.routers;
  return {
    ok: true,
    reason: null,
    output: `${header(dstText)}\n64 bytes from ${dstText}: icmp_seq=1 ttl=${String(ttl)} time=0.412 ms\n\n${statistics(dstText, 1, false)}`,
    explanation:
      request.routers === 0
        ? `${source.name} et ${request.at.name} sont sur le même réseau : la réponse est revenue sans passer par un routeur (ttl=64).`
        : `Aller et retour par ${String(request.routers)} routeur${request.routers > 1 ? "s" : ""} : la réponse arrive avec un TTL de ${String(ttl)}, un de moins par routeur traversé.`,
    steps,
    links: request.links,
  };
}

function segments(network: Network): Segments {
  return new Segments(network);
}
