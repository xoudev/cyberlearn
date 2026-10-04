import { cidrOf, isHostAddress, parseCidr, parseIp } from "./ip";

/**
 * The network of a <NetworkLab>: devices (PCs, switches, routers) with ports,
 * and cables between ports. A PC has one port, eth0; a router four, eth0 to
 * eth3, each with its own address; a switch eight, with no address at all,
 * since it works below IP. Every function here is pure: the site's canvas and
 * the lesson check build and change a network the same way.
 */

export type DeviceKind = "pc" | "switch" | "router";

export interface Address {
  readonly ip: number;
  readonly prefix: number;
}

export interface Route {
  readonly network: number;
  readonly prefix: number;
  readonly via: number;
}

export interface Device {
  readonly id: string;
  readonly kind: DeviceKind;
  readonly name: string;
  /** By port: eth0 of a PC, eth0 to eth3 of a router. A switch has none. */
  readonly addresses: Readonly<Record<string, Address>>;
  /** A PC's default gateway. */
  readonly gateway: number | null;
  /** A router's static routes; a prefix of 0 is its default route. */
  readonly routes: readonly Route[];
}

export interface Port {
  readonly device: string;
  readonly port: string;
}

export interface Link {
  readonly id: string;
  readonly a: Port;
  readonly b: Port;
}

export interface Network {
  readonly devices: readonly Device[];
  readonly links: readonly Link[];
}

export const PORTS: Readonly<Record<DeviceKind, readonly string[]>> = {
  pc: ["eth0"],
  router: ["eth0", "eth1", "eth2", "eth3"],
  switch: ["1", "2", "3", "4", "5", "6", "7", "8"],
};

export const KIND_LABEL: Readonly<Record<DeviceKind, string>> = {
  pc: "PC",
  switch: "Switch",
  router: "Routeur",
};

const NAME_PREFIX: Readonly<Record<DeviceKind, string>> = { pc: "PC", switch: "SW", router: "R" };

export function deviceById(network: Network, id: string): Device | undefined {
  return network.devices.find((d) => d.id === id);
}

/** A device by its name, as a check or a learner writes it (case does not matter). */
export function deviceByName(network: Network, name: string): Device | undefined {
  const wanted = name.trim().toLowerCase();
  return network.devices.find((d) => d.name.toLowerCase() === wanted);
}

export function linksOf(network: Network, deviceId: string): Link[] {
  return network.links.filter((l) => l.a.device === deviceId || l.b.device === deviceId);
}

/** The other end of the cable on a port, if any. */
export function peerOf(network: Network, port: Port): Port | null {
  for (const link of network.links) {
    if (link.a.device === port.device && link.a.port === port.port) return link.b;
    if (link.b.device === port.device && link.b.port === port.port) return link.a;
  }
  return null;
}

export function freePort(network: Network, device: Device): string | null {
  return (
    PORTS[device.kind].find((p) => peerOf(network, { device: device.id, port: p }) === null) ?? null
  );
}

export function linkBetween(network: Network, a: string, b: string): Link | undefined {
  return network.links.find(
    (l) => (l.a.device === a && l.b.device === b) || (l.a.device === b && l.b.device === a),
  );
}

/** PC1, PC2… the first number no device of the kind has. */
export function nextName(network: Network, kind: DeviceKind): string {
  const taken = new Set(network.devices.map((d) => d.name.toLowerCase()));
  for (let n = 1; n < 100; n++) {
    const name = `${NAME_PREFIX[kind]}${String(n)}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
  return `${NAME_PREFIX[kind]}${String(network.devices.length + 1)}`;
}

function nextId(network: Network, kind: DeviceKind): string {
  const taken = new Set(network.devices.map((d) => d.id));
  for (let n = 1; ; n++) {
    const id = `${kind}-${String(n)}`;
    if (!taken.has(id)) return id;
  }
}

export function newDevice(network: Network, kind: DeviceKind): Device {
  return {
    id: nextId(network, kind),
    kind,
    name: nextName(network, kind),
    addresses: {},
    gateway: null,
    routes: [],
  };
}

export function addDevice(network: Network, device: Device): Network {
  return { ...network, devices: [...network.devices, device] };
}

/** Removes devices and the cables plugged into them. */
export function removeDevices(network: Network, ids: readonly string[]): Network {
  const gone = new Set(ids);
  return {
    devices: network.devices.filter((d) => !gone.has(d.id)),
    links: network.links.filter((l) => !gone.has(l.a.device) && !gone.has(l.b.device)),
  };
}

export function removeLinks(network: Network, ids: readonly string[]): Network {
  const gone = new Set(ids);
  return { ...network, links: network.links.filter((l) => !gone.has(l.id)) };
}

export function updateDevice(
  network: Network,
  id: string,
  patch: Partial<Pick<Device, "name" | "addresses" | "gateway" | "routes">>,
): Network {
  return {
    ...network,
    devices: network.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
  };
}

export type Connected = { ok: true; network: Network; link: Link } | { ok: false; problem: string };

/** Plugs a cable between two devices, on the first free port of each. */
export function connect(network: Network, aId: string, bId: string): Connected {
  const a = deviceById(network, aId);
  const b = deviceById(network, bId);
  if (!a || !b) return { ok: false, problem: "Un des deux appareils n'existe plus." };
  if (a.id === b.id) return { ok: false, problem: "Un câble relie deux appareils différents." };
  if (linkBetween(network, a.id, b.id)) {
    return { ok: false, problem: `${a.name} et ${b.name} sont déjà reliés.` };
  }
  const portA = freePort(network, a);
  const portB = freePort(network, b);
  if (portA === null) return { ok: false, problem: `${a.name} n'a plus de port libre.` };
  if (portB === null) return { ok: false, problem: `${b.name} n'a plus de port libre.` };
  const taken = new Set(network.links.map((l) => l.id));
  let n = network.links.length + 1;
  while (taken.has(`link-${String(n)}`)) n++;
  const link: Link = {
    id: `link-${String(n)}`,
    a: { device: a.id, port: portA },
    b: { device: b.id, port: portB },
  };
  return { ok: true, network: { ...network, links: [...network.links, link] }, link };
}

// ── From the lesson's props ─────────────────────────────────────────────────

export interface LabDevice {
  readonly id: string;
  readonly kind: DeviceKind;
  readonly name: string;
  /** By port, as a learner writes them: { "eth0": "192.168.1.10/24" }. */
  readonly addresses?: Readonly<Record<string, string>> | undefined;
  readonly gateway?: string | undefined;
  readonly routes?: readonly { readonly to: string; readonly via: string }[] | undefined;
}

export interface LabTopology {
  readonly devices: readonly LabDevice[];
  readonly links: readonly (readonly [string, string])[];
}

export type Built = { ok: true; network: Network } | { ok: false; problem: string };

/** An address as a learner types it, "192.168.1.10/24"; null when it is not one. */
export function parseAddress(text: string): Address | null {
  const cidr = parseCidr(text);
  return cidr === null ? null : { ip: cidr.address, prefix: cidr.prefix };
}

export function addressText(address: Address): string {
  return cidrOf(address.ip, address.prefix);
}

/**
 * The network a lesson starts from. What the schema cannot see is checked
 * here: names and ids unique, cables between devices that exist, ports that
 * are enough, addresses that parse and are host addresses.
 */
export function buildNetwork(lab: LabTopology): Built {
  const ids = new Set<string>();
  const names = new Set<string>();
  const devices: Device[] = [];
  for (const d of lab.devices) {
    if (ids.has(d.id)) return { ok: false, problem: `deux appareils ont l'identifiant ${d.id}.` };
    if (names.has(d.name.toLowerCase())) {
      return { ok: false, problem: `deux appareils s'appellent ${d.name}.` };
    }
    ids.add(d.id);
    names.add(d.name.toLowerCase());
    const addresses: Record<string, Address> = {};
    for (const [port, text] of Object.entries(d.addresses ?? {})) {
      if (!PORTS[d.kind].includes(port) || d.kind === "switch") {
        return { ok: false, problem: `${d.name} n'a pas de port ${port} à adresser.` };
      }
      const address = parseAddress(text);
      if (address === null)
        return { ok: false, problem: `l'adresse de ${d.name} (${text}) est invalide.` };
      if (!isHostAddress(address.ip, address.prefix)) {
        return {
          ok: false,
          problem: `l'adresse de ${d.name} (${text}) est celle du réseau ou de diffusion, pas d'une machine.`,
        };
      }
      addresses[port] = address;
    }
    let gateway: number | null = null;
    if (d.gateway !== undefined) {
      gateway = parseIp(d.gateway);
      if (gateway === null)
        return { ok: false, problem: `la passerelle de ${d.name} (${d.gateway}) est invalide.` };
    }
    const routes: Route[] = [];
    for (const r of d.routes ?? []) {
      const to = parseCidr(r.to);
      const via = parseIp(r.via);
      if (to === null || via === null) {
        return { ok: false, problem: `la route de ${d.name} (${r.to} via ${r.via}) est invalide.` };
      }
      routes.push({ network: to.address, prefix: to.prefix, via });
    }
    devices.push({ id: d.id, kind: d.kind, name: d.name, addresses, gateway, routes });
  }
  let network: Network = { devices, links: [] };
  for (const [a, b] of lab.links) {
    const nameOf = (id: string): string => deviceById(network, id)?.name ?? id;
    if (!ids.has(a) || !ids.has(b)) {
      return { ok: false, problem: `le câble ${a} - ${b} relie un appareil qui n'existe pas.` };
    }
    const connected = connect(network, a, b);
    if (!connected.ok) {
      return { ok: false, problem: `le câble ${nameOf(a)} - ${nameOf(b)} : ${connected.problem}` };
    }
    network = connected.network;
  }
  return { ok: true, network };
}
