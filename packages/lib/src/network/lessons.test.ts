import { readFileSync } from "node:fs";
import { parseNetworkLab } from "@cyberlearn/types";
import { expect, it } from "vitest";
import { checkHolds } from "./checks";
import {
  addDevice,
  buildNetwork,
  connect,
  deviceByName,
  type Network,
  newDevice,
  updateDevice,
} from "./topology";

/**
 * The lessons' network labs, each played as its hints say: no check holds at
 * the start, every one holds at the end. A lab a learner could not finish
 * fails here before it ships.
 */

/** What a learner does, exercise by exercise. */
const SOLUTIONS: Record<string, (n: Network) => Network> = {
  "net-un-reseau": (n) => {
    let net = n;
    const pc2 = deviceByName(net, "PC2");
    if (pc2)
      net = updateDevice(net, pc2.id, { addresses: { eth0: { ip: 0xc0a80114, prefix: 24 } } });
    const pc3 = newDevice(net, "pc");
    net = addDevice(net, pc3);
    const wired = connect(net, pc3.id, "sw1");
    if (!wired.ok) throw new Error(wired.problem);
    net = updateDevice(wired.network, pc3.id, {
      addresses: { eth0: { ip: 0xc0a8011e, prefix: 24 } },
    });
    return net;
  },
  "net-passerelles": (n) => {
    let net = n;
    const r1 = deviceByName(net, "R1");
    const pc1 = deviceByName(net, "PC1");
    const pc2 = deviceByName(net, "PC2");
    if (!r1 || !pc1 || !pc2) throw new Error("devices");
    net = updateDevice(net, r1.id, {
      addresses: { ...r1.addresses, eth1: { ip: 0xc0a80201, prefix: 24 } },
    });
    net = updateDevice(net, pc1.id, { gateway: 0xc0a80101 });
    net = updateDevice(net, pc2.id, { gateway: 0xc0a80201 });
    return net;
  },
  "net-routes-statiques": (n) => {
    let net = n;
    const r1 = deviceByName(net, "R1");
    const r2 = deviceByName(net, "R2");
    if (!r1 || !r2) throw new Error("routers");
    net = updateDevice(net, r1.id, {
      routes: [{ network: 0xc0a80200, prefix: 24, via: 0x0a000002 }],
    });
    net = updateDevice(net, r2.id, {
      routes: [{ network: 0xc0a80100, prefix: 24, via: 0x0a000001 }],
    });
    return net;
  },
  "net-diagnostic": (n) => {
    let net = n;
    const pc1 = deviceByName(net, "PC1");
    const srv = deviceByName(net, "SRV");
    if (!pc1 || !srv) throw new Error("devices");
    net = updateDevice(net, pc1.id, { gateway: 0xc0a80101 });
    net = updateDevice(net, srv.id, { gateway: 0xcb007101 });
    return net;
  },
};

it("can be solved, each as its hints say", () => {
  for (const file of ["04-ip-adressage.mdx", "06-routage.mdx", "12-projet-diagnostic-reseau.mdx"]) {
    const mdx = readFileSync(`../../content/lessons/reseau/${file}`, "utf8").replace(
      /\r\n/gu,
      "\n",
    );
    for (const block of mdx.match(/<NetworkLab\n[\s\S]*?\n\/>/gu) ?? []) {
      const prop = (name: string): unknown => {
        const line = block.split("\n").find((l) => l.startsWith(`  ${name}=`));
        if (line === undefined) return undefined;
        const value = line.slice(name.length + 3);
        return value.startsWith('"') ? value.slice(1, -1) : JSON.parse(value.slice(1, -1));
      };
      const parsed = parseNetworkLab({
        id: prop("id"),
        title: prop("title"),
        task: prop("task"),
        devices: prop("devices"),
        links: prop("links"),
        checks: prop("checks"),
        hints: prop("hints"),
        locked: prop("locked"),
      });
      if (!parsed.ok) throw new Error(`${file}: ${parsed.problem}`);
      const built = buildNetwork(parsed.value);
      if (!built.ok) throw new Error(`${file}: ${built.problem}`);
      const checks = parsed.value.checks ?? [];
      const before = checks.map((c) => checkHolds(built.network, c));
      const solve = SOLUTIONS[parsed.value.id];
      if (!solve) throw new Error(`no solution for ${parsed.value.id}`);
      const solved = solve(built.network);
      const after = checks.map((c) => checkHolds(solved, c));
      expect(before.every((b) => !b)).toBe(true);
      expect(after.every(Boolean)).toBe(true);
    }
  }
});
