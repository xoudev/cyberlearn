import { describe, expect, it } from "vitest";
import { parseFirewallLab } from "../firewall-lab.schema";

const PROBES = [
  {
    label: "Un visiteur ouvre le site",
    proto: "tcp",
    from: "203.0.113.5",
    port: 443,
    expect: "accept",
  },
  { label: "Un inconnu tente SSH", proto: "tcp", from: "198.51.100.7", port: 22, expect: "block" },
  { label: "Un ping", proto: "icmp", from: "192.0.2.10", expect: "accept" },
];

describe("parseFirewallLab", () => {
  it("accepts a lab, and starts from an open firewall when no rules are given", () => {
    const parsed = parseFirewallLab({ id: "f", task: "Ferme ce qui doit l'être.", probes: PROBES });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.rules).toBe("policy accept");
    expect(parsed.value.probes[2]).toEqual({
      label: "Un ping",
      proto: "icmp",
      from: "192.0.2.10",
      state: "new",
      expect: "accept",
    });
  });

  it("wants a port for tcp and udp, none for icmp, and says which packet", () => {
    expect(
      parseFirewallLab({
        id: "f",
        task: "x",
        probes: [{ label: "a", proto: "tcp", from: "203.0.113.5", expect: "accept" }],
      }),
    ).toEqual({ ok: false, problem: "un paquet tcp vise un port : donne-le." });
    expect(
      parseFirewallLab({
        id: "f",
        task: "x",
        probes: [{ label: "a", proto: "icmp", from: "203.0.113.5", port: 22, expect: "accept" }],
      }),
    ).toEqual({ ok: false, problem: "un paquet icmp n'a pas de port." });
  });

  it("refuses a bad address, and names the packet it is in", () => {
    expect(
      parseFirewallLab({
        id: "f",
        task: "x",
        probes: [{ label: "a", proto: "tcp", from: "203.0.113.300", port: 22, expect: "accept" }],
      }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("probes.0.from : ") as string });
  });

  it("refuses two packets with the same name, and an empty list", () => {
    expect(parseFirewallLab({ id: "f", task: "x", probes: [PROBES[0], PROBES[0]] })).toMatchObject({
      ok: false,
      problem: expect.stringContaining("Un visiteur ouvre le site") as string,
    });
    expect(parseFirewallLab({ id: "f", task: "x", probes: [] }).ok).toBe(false);
  });
});
