import { describe, expect, it } from "vitest";
import { parsePacketDissector } from "../packet-dissector.schema";

const ETH = { src: "08:00:27:4e:66:a1", dst: "00:0c:29:1a:2b:3c" };
const IP = { src: "192.168.1.42", dst: "93.184.216.34" };

describe("parsePacketDissector", () => {
  it("accepts an ARP frame, and an IP frame with each transport", () => {
    expect(
      parsePacketDissector({
        id: "p",
        frame: {
          eth: { ...ETH, dst: "ff:ff:ff:ff:ff:ff" },
          arp: {
            op: "request",
            senderMac: ETH.src,
            senderIp: "192.168.1.42",
            targetMac: "00:00:00:00:00:00",
            targetIp: "192.168.1.20",
          },
        },
      }).ok,
    ).toBe(true);
    for (const transport of [
      { tcp: { sport: 50324, dport: 443 } },
      { udp: { sport: 41000, dport: 53 } },
      { icmp: { type: "echo-request" } },
    ]) {
      expect(parsePacketDissector({ id: "p", frame: { eth: ETH, ip: IP, ...transport } }).ok).toBe(
        true,
      );
    }
  });

  it("fills in what a lesson leaves out: TTL 64, ACK alone, a full window, no FCS", () => {
    const parsed = parsePacketDissector({
      id: "p",
      frame: { eth: ETH, ip: IP, tcp: { sport: 50324, dport: 80 }, payload: "GET / HTTP/1.1" },
    });
    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.value.frame.ip).toEqual({ ...IP, ttl: 64, id: 0, dontFragment: true });
    expect(parsed.value.frame.tcp).toEqual({
      sport: 50324,
      dport: 80,
      seq: 0,
      ack: 0,
      flags: ["ACK"],
      window: 65535,
    });
    expect(parsed.value.frame.fcs).toBe(false);
    expect(parsed.value.find).toBeUndefined();
  });

  it("wants ARP or IP, and one of them only", () => {
    expect(parsePacketDissector({ id: "p", frame: { eth: ETH } })).toEqual({
      ok: false,
      problem: "une trame porte arp ou ip : il manque l'un des deux.",
    });
    const arp = {
      op: "reply",
      senderMac: ETH.src,
      senderIp: "192.168.1.42",
      targetMac: ETH.dst,
      targetIp: "192.168.1.1",
    };
    expect(
      parsePacketDissector({
        id: "p",
        frame: { eth: ETH, arp, ip: IP, tcp: { sport: 1, dport: 2 } },
      }),
    ).toEqual({ ok: false, problem: "une trame porte arp ou ip, pas les deux." });
    expect(parsePacketDissector({ id: "p", frame: { eth: ETH, arp, payload: "x" } })).toEqual({
      ok: false,
      problem: "avec arp, pas de tcp, udp, icmp ni payload : ARP n'a rien au-dessus de lui.",
    });
  });

  it("wants one transport with IP, no more, no less", () => {
    expect(parsePacketDissector({ id: "p", frame: { eth: ETH, ip: IP } })).toEqual({
      ok: false,
      problem: "avec ip, il faut tcp, udp ou icmp.",
    });
    expect(
      parsePacketDissector({
        id: "p",
        frame: { eth: ETH, ip: IP, tcp: { sport: 1, dport: 2 }, udp: { sport: 1, dport: 2 } },
      }),
    ).toEqual({ ok: false, problem: "tcp, udp et icmp : un seul à la fois." });
  });

  it("says what an address should look like, and which one is wrong", () => {
    const mac = parsePacketDissector({
      id: "p",
      frame: { eth: { ...ETH, dst: "00-0c-29-1a-2b-3c" }, ip: IP, icmp: { type: "echo-reply" } },
    });
    expect(mac).toMatchObject({
      ok: false,
      problem: expect.stringContaining("frame.eth.dst : ") as string,
    });
    expect(mac).toMatchObject({
      problem: expect.stringContaining("six paires hexadécimales") as string,
    });
    const ip = parsePacketDissector({
      id: "p",
      frame: { eth: ETH, ip: { ...IP, dst: "192.168.1.300" }, icmp: { type: "echo-reply" } },
    });
    expect(ip).toMatchObject({
      ok: false,
      problem: expect.stringContaining("frame.ip.dst : ") as string,
    });
    expect(ip).toMatchObject({ problem: expect.stringContaining("0 à 255") as string });
  });

  it("refuses a flag, a port or a field name it does not know", () => {
    const base = { eth: ETH, ip: IP };
    expect(
      parsePacketDissector({
        id: "p",
        frame: { ...base, tcp: { sport: 1, dport: 2, flags: ["SIN"] } },
      }).ok,
    ).toBe(false);
    expect(
      parsePacketDissector({ id: "p", frame: { ...base, tcp: { sport: 70000, dport: 2 } } }).ok,
    ).toBe(false);
    expect(
      parsePacketDissector({
        id: "p",
        frame: { ...base, tcp: { sport: 1, dport: 2 } },
        find: ["ipdst"],
      }),
    ).toMatchObject({ ok: false, problem: expect.stringContaining("couche.champ") as string });
    expect(
      parsePacketDissector({ id: "p", frame: { ...base, tcp: { sport: 1, dport: 2 } }, find: [] })
        .ok,
    ).toBe(false);
  });
});
