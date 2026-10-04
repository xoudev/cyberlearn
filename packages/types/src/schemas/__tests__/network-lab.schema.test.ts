import { describe, expect, it } from "vitest";
import { parseNetworkLab } from "../network-lab.schema.js";

const LAB = {
  id: "n",
  task: "Relie et configure.",
  devices: [
    { id: "pc1", kind: "pc", name: "PC1", x: 40, y: 200, addresses: { eth0: "192.168.1.10/24" } },
    { id: "sw1", kind: "switch", name: "SW1", x: 200, y: 100 },
    {
      id: "r1",
      kind: "router",
      name: "R1",
      x: 360,
      y: 30,
      addresses: { eth0: "192.168.1.1/24" },
      routes: [{ to: "0.0.0.0/0", via: "192.168.1.254" }],
    },
  ],
  links: [
    ["pc1", "sw1"],
    ["sw1", "r1"],
  ],
  checks: [
    { label: "PC1 joint R1", expect: "ping", from: "PC1", to: "R1" },
    { label: "Une route", expect: "route", device: "R1", to: "0.0.0.0/0" },
  ],
};

describe("parseNetworkLab", () => {
  it("accepts a lab, cables and checks included, unlocked unless said", () => {
    const parsed = parseNetworkLab(LAB);
    expect(parsed.ok && parsed.value.locked).toBe(false);
    expect(parseNetworkLab({ ...LAB, links: undefined, checks: undefined }).ok).toBe(true);
  });

  it("refuses an address without its prefix, and says where", () => {
    const wrong = {
      ...LAB,
      devices: [
        { id: "pc1", kind: "pc", name: "PC1", x: 0, y: 0, addresses: { eth0: "192.168.1.10" } },
      ],
    };
    expect(parseNetworkLab(wrong)).toEqual({
      ok: false,
      problem: "devices.0.addresses.eth0 : adresse attendue avec son préfixe : 192.168.1.10/24.",
    });
  });

  it("refuses a port a device cannot have, a check it does not know, a name that is not one", () => {
    const eth4 = { ...LAB, devices: [{ ...LAB.devices[0], addresses: { eth4: "10.0.0.1/24" } }] };
    expect(parseNetworkLab(eth4).ok).toBe(false);
    expect(parseNetworkLab({ ...LAB, checks: [{ label: "x", expect: "dns" }] }).ok).toBe(false);
    expect(parseNetworkLab({ ...LAB, devices: [{ ...LAB.devices[0], name: "PC 1" }] }).ok).toBe(
      false,
    );
  });
});
