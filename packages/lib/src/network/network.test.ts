import { describe, expect, it } from "vitest";
import { checkHolds } from "./checks";
import { cidrOf, isHostAddress, networkOf, parseCidr, parseIp, parsePrefix, subnetOf } from "./ip";
import { ping } from "./ping";
import {
  addDevice,
  buildNetwork,
  connect,
  deviceByName,
  type LabTopology,
  type Network,
  newDevice,
  updateDevice,
} from "./topology";

/** Two LANs around one router: the routing lesson's own picture. */
const TWO_LANS: LabTopology = {
  devices: [
    {
      id: "pc1",
      kind: "pc",
      name: "PC1",
      addresses: { eth0: "192.168.1.10/24" },
      gateway: "192.168.1.1",
    },
    { id: "sw1", kind: "switch", name: "SW1" },
    {
      id: "r1",
      kind: "router",
      name: "R1",
      addresses: { eth0: "192.168.1.1/24", eth1: "192.168.2.1/24" },
    },
    { id: "sw2", kind: "switch", name: "SW2" },
    {
      id: "pc2",
      kind: "pc",
      name: "PC2",
      addresses: { eth0: "192.168.2.10/24" },
      gateway: "192.168.2.1",
    },
  ],
  links: [
    ["pc1", "sw1"],
    ["sw1", "r1"],
    ["r1", "sw2"],
    ["sw2", "pc2"],
  ],
};

/** Two routers back to back on a /30: static routes needed on both. */
const TWO_ROUTERS: LabTopology = {
  devices: [
    {
      id: "pc1",
      kind: "pc",
      name: "PC1",
      addresses: { eth0: "192.168.1.10/24" },
      gateway: "192.168.1.1",
    },
    {
      id: "r1",
      kind: "router",
      name: "R1",
      addresses: { eth0: "192.168.1.1/24", eth1: "10.0.0.1/30" },
    },
    {
      id: "r2",
      kind: "router",
      name: "R2",
      addresses: { eth0: "10.0.0.2/30", eth1: "192.168.2.1/24" },
    },
    {
      id: "pc2",
      kind: "pc",
      name: "PC2",
      addresses: { eth0: "192.168.2.10/24" },
      gateway: "192.168.2.1",
    },
  ],
  links: [
    ["pc1", "r1"],
    ["r1", "r2"],
    ["r2", "pc2"],
  ],
};

function build(lab: LabTopology): Network {
  const built = buildNetwork(lab);
  if (!built.ok) throw new Error(built.problem);
  return built.network;
}

function withDevice(
  lab: LabTopology,
  id: string,
  patch: Partial<LabTopology["devices"][number]>,
): LabTopology {
  return { ...lab, devices: lab.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}

describe("addresses", () => {
  it("reads an address, a prefix or a mask, and refuses what is neither", () => {
    expect(parseIp("192.168.1.10")).toBe(0xc0a8010a);
    expect(parseIp("192.168.1.300")).toBeNull();
    expect(parsePrefix("24")).toBe(24);
    expect(parsePrefix("255.255.255.0")).toBe(24);
    expect(parsePrefix("255.0.255.0")).toBeNull();
    expect(parseCidr("10.0.0.2/30")).toEqual({ address: 0x0a000002, prefix: 30 });
    expect(parseCidr("10.0.0.2")).toBeNull();
  });

  it("knows a subnet, its network address and its broadcast", () => {
    const ip = parseIp("192.168.1.42") ?? 0;
    expect(cidrOf(networkOf(ip, 24), 24)).toBe("192.168.1.0/24");
    expect(subnetOf(ip, 16)).toBe("192.168.0.0/16");
    expect(isHostAddress(ip, 24)).toBe(true);
    expect(isHostAddress(parseIp("192.168.1.0") ?? 0, 24)).toBe(false);
    expect(isHostAddress(parseIp("192.168.1.255") ?? 0, 24)).toBe(false);
    expect(isHostAddress(parseIp("10.0.0.1") ?? 0, 31)).toBe(true);
  });
});

describe("the network of a lesson", () => {
  it("is built with its cables on the first free ports", () => {
    const network = build(TWO_LANS);
    expect(network.links.map((l) => `${l.a.device}:${l.a.port}-${l.b.device}:${l.b.port}`)).toEqual(
      ["pc1:eth0-sw1:1", "sw1:2-r1:eth0", "r1:eth1-sw2:1", "sw2:2-pc2:eth0"],
    );
  });

  it.each([
    [
      "two devices with one name",
      withDevice(TWO_LANS, "pc2", { name: "PC1" }),
      "deux appareils s'appellent PC1",
    ],
    [
      "a cable to nowhere",
      { ...TWO_LANS, links: [...TWO_LANS.links, ["pc1", "pc9"] as const] },
      "le câble pc1 - pc9 relie un appareil qui n'existe pas",
    ],
    [
      "a second cable on a PC",
      { ...TWO_LANS, links: [...TWO_LANS.links, ["pc1", "sw2"] as const] },
      "le câble PC1 - SW2 : PC1 n'a plus de port libre",
    ],
    [
      "an address on a switch",
      withDevice(TWO_LANS, "sw1", { addresses: { eth0: "192.168.1.2/24" } }),
      "SW1 n'a pas de port eth0 à adresser",
    ],
    [
      "an address that is not one",
      withDevice(TWO_LANS, "pc1", { addresses: { eth0: "192.168.1.10" } }),
      "l'adresse de PC1 (192.168.1.10) est invalide",
    ],
    [
      "the network's own address",
      withDevice(TWO_LANS, "pc1", { addresses: { eth0: "192.168.1.0/24" } }),
      "pas d'une machine",
    ],
  ])("refuses %s, and says so", (_label, lab, problem) => {
    const built = buildNetwork(lab);
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain(problem);
  });

  it("names a new device after the ones there, and cables it on a free port", () => {
    const network = build(TWO_LANS);
    const pc3 = newDevice(network, "pc");
    expect(pc3.name).toBe("PC3");
    const connected = connect(addDevice(network, pc3), pc3.id, "sw1");
    expect(connected.ok && connected.link.b).toEqual({ device: "sw1", port: "3" });
    const again = connect(network, "pc1", "sw2");
    expect(again.ok ? "" : again.problem).toBe("PC1 n'a plus de port libre.");
  });
});

describe("ping", () => {
  it("crosses the router and comes back, one TTL less", () => {
    const result = ping(build(TWO_LANS), "PC1", "192.168.2.10");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("64 bytes from 192.168.2.10: icmp_seq=1 ttl=63");
    expect(result.output).toContain("1 packets transmitted, 1 received, 0% packet loss");
    expect(result.links).toEqual(["link-1", "link-2", "link-3", "link-4"]);
    expect(result.steps.map((s) => s.text)).toEqual([
      "PC1 : 192.168.2.10 n'est pas dans mon réseau 192.168.1.0/24, j'envoie à ma passerelle 192.168.1.1.",
      "R1 : 192.168.2.10 est dans le réseau de eth1 (192.168.2.0/24), je livre directement.",
      "PC2 : c'est pour moi (192.168.2.10).",
      "PC2 répond à 192.168.1.10.",
      "PC2 : 192.168.1.10 n'est pas dans mon réseau 192.168.2.0/24, j'envoie à ma passerelle 192.168.2.1.",
      "R1 : 192.168.1.10 est dans le réseau de eth0 (192.168.1.0/24), je livre directement.",
      "PC1 : c'est pour moi (192.168.1.10).",
    ]);
  });

  it("stays on the LAN, by a device's name, with a TTL of 64", () => {
    const lan = build({ devices: TWO_LANS.devices.slice(0, 3), links: TWO_LANS.links.slice(0, 2) });
    const result = ping(lan, "PC1", "R1");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("ttl=64");
    expect(result.explanation).toContain("sans passer par un routeur");
    expect(ping(lan, "PC1", "192.168.1.10").explanation).toContain("se ping lui-même");
  });

  it("cannot leave its network without a gateway", () => {
    const result = ping(
      build(withDevice(TWO_LANS, "pc1", { gateway: undefined })),
      "PC1",
      "192.168.2.10",
    );
    expect(result).toMatchObject({
      ok: false,
      reason: "net-unreachable",
      output: "ping: connect: Network is unreachable",
    });
    expect(result.explanation).toContain("n'a pas de passerelle par défaut");
  });

  it("finds nobody at a gateway that is not there", () => {
    const result = ping(
      build(withDevice(TWO_LANS, "pc1", { gateway: "192.168.1.254" })),
      "PC1",
      "192.168.2.10",
    );
    expect(result.reason).toBe("host-unreachable");
    expect(result.output).toContain("From 192.168.1.10 icmp_seq=1 Destination Host Unreachable");
    expect(result.output).toContain("+1 errors, 100% packet loss");
    expect(result.explanation).toBe(
      "PC1 a cherché sa passerelle 192.168.1.254 sur eth0 (ARP) : personne n'a répondu.",
    );
  });

  it("says when a cable is missing", () => {
    const result = ping(
      build({ ...TWO_LANS, links: TWO_LANS.links.slice(1) }),
      "PC1",
      "192.168.1.1",
    );
    expect(result.reason).toBe("host-unreachable");
    expect(result.explanation).toContain("PC1 n'est câblé à rien sur eth0");
  });

  it("is dropped by a PC used as a gateway", () => {
    const lab = withDevice(
      {
        ...TWO_LANS,
        devices: [
          ...TWO_LANS.devices,
          { id: "pc3", kind: "pc", name: "PC3", addresses: { eth0: "192.168.1.20/24" } },
        ],
        links: [...TWO_LANS.links, ["pc3", "sw1"]],
      },
      "pc1",
      { gateway: "192.168.1.20" },
    );
    const result = ping(build(lab), "PC1", "192.168.2.10");
    expect(result.reason).toBe("timeout");
    expect(result.output).toContain("1 packets transmitted, 0 received, 100% packet loss");
    expect(result.explanation).toContain("PC3, qui n'est pas un routeur");
  });

  it("needs a route on each router, there and back", () => {
    const noRoutes = ping(build(TWO_ROUTERS), "PC1", "192.168.2.10");
    expect(noRoutes.reason).toBe("net-unreachable");
    expect(noRoutes.output).toContain("From 192.168.1.1 icmp_seq=1 Destination Net Unreachable");
    expect(noRoutes.explanation).toBe(
      "R1 n'a aucune route vers 192.168.2.10 : ni réseau connecté, ni route statique, ni route par défaut.",
    );

    const oneWay = withDevice(TWO_ROUTERS, "r1", {
      routes: [{ to: "192.168.2.0/24", via: "10.0.0.2" }],
    });
    const noWayBack = ping(build(oneWay), "PC1", "192.168.2.10");
    expect(noWayBack.reason).toBe("timeout");
    expect(noWayBack.explanation).toContain(
      "la réponse n'a pas pu revenir. R2 n'a aucune route vers 192.168.1.10",
    );

    const bothWays = withDevice(oneWay, "r2", { routes: [{ to: "0.0.0.0/0", via: "10.0.0.1" }] });
    const result = ping(build(bothWays), "PC1", "192.168.2.10");
    expect(result.ok).toBe(true);
    expect(result.output).toContain("ttl=62");
    expect(result.steps.map((s) => s.text)).toContain(
      "R1 : route 192.168.2.0/24 via 10.0.0.2, je passe par eth1.",
    );
    expect(result.steps.map((s) => s.text)).toContain(
      "R2 : route par défaut via 10.0.0.1, je passe par eth0.",
    );
  });

  it("throws a packet away when two routers bounce it between them", () => {
    const loop = withDevice(
      withDevice(TWO_ROUTERS, "r1", { routes: [{ to: "0.0.0.0/0", via: "10.0.0.2" }] }),
      "r2",
      { routes: [{ to: "0.0.0.0/0", via: "10.0.0.1" }] },
    );
    const result = ping(build(loop), "PC1", "8.8.8.8");
    expect(result.reason).toBe("ttl-exceeded");
    expect(result.output).toContain("Time to live exceeded");
  });

  it("refuses a target that is nothing, and a switch as a source", () => {
    const network = build(TWO_LANS);
    expect(ping(network, "PC1", "192.168.1.300").output).toBe(
      "ping: 192.168.1.300: Name or service not known",
    );
    expect(ping(network, "SW1", "192.168.1.10").explanation).toContain("SW1 est un switch");
    expect(ping(network, "PC1", "SW1").explanation).toContain("SW1 n'a pas d'adresse IP");
  });
});

describe("checks", () => {
  const network = build(TWO_ROUTERS);
  const r1 = deviceByName(network, "R1");
  const routed = r1
    ? updateDevice(network, r1.id, {
        routes: [{ network: 0xc0a80200, prefix: 24, via: 0x0a000002 }],
      })
    : network;

  it("ticks addresses, gateways, routes, cables and counts", () => {
    expect(
      checkHolds(network, { label: "", expect: "address", device: "PC1", in: "192.168.1.0/24" }),
    ).toBe(true);
    expect(
      checkHolds(network, { label: "", expect: "address", device: "PC1", in: "192.168.1.0/16" }),
    ).toBe(false);
    expect(
      checkHolds(network, { label: "", expect: "gateway", device: "PC1", is: "192.168.1.1" }),
    ).toBe(true);
    expect(
      checkHolds(routed, {
        label: "",
        expect: "route",
        device: "R1",
        to: "192.168.2.0/24",
        via: "10.0.0.2",
      }),
    ).toBe(true);
    expect(
      checkHolds(routed, {
        label: "",
        expect: "route",
        device: "R1",
        to: "192.168.2.0/24",
        via: "10.0.0.9",
      }),
    ).toBe(false);
    expect(checkHolds(network, { label: "", expect: "link", between: ["R1", "R2"] })).toBe(true);
    expect(checkHolds(network, { label: "", expect: "link", between: ["PC1", "PC2"] })).toBe(false);
    expect(checkHolds(network, { label: "", expect: "count", kind: "router", min: 2 })).toBe(true);
    expect(checkHolds(network, { label: "", expect: "ping", from: "PC1", to: "PC2" })).toBe(false);
  });
});
