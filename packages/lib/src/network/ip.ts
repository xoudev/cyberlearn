/**
 * IPv4 arithmetic for the <NetworkLab> exercises. An address is a number
 * (0 to 2^32 - 1), a subnet an address and a prefix length.
 */

export function parseIp(text: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(text.trim());
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const byte = Number(m[i]);
    if (byte > 255) return null;
    n = n * 256 + byte;
  }
  return n;
}

export function formatIp(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map(String).join(".");
}

/** "24" or "255.255.255.0"; a mask with a hole (255.0.255.0) is no mask. */
export function parsePrefix(text: string): number | null {
  const t = text.trim();
  if (/^\d{1,2}$/u.test(t)) {
    const n = Number(t);
    return n <= 32 ? n : null;
  }
  const mask = parseIp(t);
  if (mask === null) return null;
  let prefix = 0;
  let zeroSeen = false;
  for (let i = 31; i >= 0; i--) {
    if (((mask >>> i) & 1) === 1) {
      if (zeroSeen) return null;
      prefix++;
    } else {
      zeroSeen = true;
    }
  }
  return prefix;
}

export interface Cidr {
  readonly address: number;
  readonly prefix: number;
}

/** "192.168.1.10/24", or with its mask: "192.168.1.10/255.255.255.0". */
export function parseCidr(text: string): Cidr | null {
  const parts = text.trim().split("/");
  if (parts.length !== 2) return null;
  const address = parseIp(parts[0] ?? "");
  const prefix = parsePrefix(parts[1] ?? "");
  return address === null || prefix === null ? null : { address, prefix };
}

export function maskOf(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export function networkOf(address: number, prefix: number): number {
  return (address & maskOf(prefix)) >>> 0;
}

export function broadcastOf(address: number, prefix: number): number {
  return (networkOf(address, prefix) | (~maskOf(prefix) >>> 0)) >>> 0;
}

export function sameSubnet(a: number, b: number, prefix: number): boolean {
  return networkOf(a, prefix) === networkOf(b, prefix);
}

/** Whether `address` falls in the subnet `network/prefix`. */
export function inSubnet(address: number, network: number, prefix: number): boolean {
  return networkOf(address, prefix) === networkOf(network, prefix);
}

/** A host address: neither the network's nor the broadcast's (a /31 or /32 has no such thing). */
export function isHostAddress(address: number, prefix: number): boolean {
  if (prefix >= 31) return true;
  return address !== networkOf(address, prefix) && address !== broadcastOf(address, prefix);
}

export function cidrOf(address: number, prefix: number): string {
  return `${formatIp(address)}/${String(prefix)}`;
}

/** The subnet an address sits in, as a learner writes it: 192.168.1.0/24. */
export function subnetOf(address: number, prefix: number): string {
  return cidrOf(networkOf(address, prefix), prefix);
}
