import { type PacketFrame, packetFrameSchema } from "@cyberlearn/types";
import { describe, expect, it } from "vitest";
import {
  type BuiltFrame,
  buildFrame,
  crc32,
  escapeText,
  fieldAt,
  hexOf,
  internetChecksum,
  missingFields,
} from "./packet";

/**
 * The frames are checked the way a receiver checks them: every byte belongs
 * to one field, the lengths add up, and each checksum verifies to zero when
 * summed with what it covers. A dump that lied here would teach a wrong byte
 * to every learner who clicked it.
 */

function frame(spec: unknown): PacketFrame {
  const parsed = packetFrameSchema.safeParse(spec);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "bad frame");
  return parsed.data;
}

const SRC_MAC = "08:00:27:4e:66:a1";
const GATEWAY_MAC = "00:0c:29:1a:2b:3c";

const ARP_REQUEST = frame({
  eth: { src: SRC_MAC, dst: "ff:ff:ff:ff:ff:ff" },
  arp: {
    op: "request",
    senderMac: SRC_MAC,
    senderIp: "192.168.1.42",
    targetMac: "00:00:00:00:00:00",
    targetIp: "192.168.1.20",
  },
});

const SYN = frame({
  eth: { src: SRC_MAC, dst: GATEWAY_MAC },
  ip: { src: "192.168.1.42", dst: "93.184.216.34", id: 7238 },
  tcp: { sport: 50324, dport: 443, seq: 1000, flags: ["SYN"], window: 64240 },
});

const HTTP = "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n";
const GET = frame({
  eth: { src: SRC_MAC, dst: GATEWAY_MAC },
  ip: { src: "192.168.1.42", dst: "93.184.216.34", ttl: 64 },
  tcp: { sport: 50324, dport: 80, seq: 1001, ack: 5001, flags: ["PSH", "ACK"] },
  payload: HTTP,
});

const field = (built: BuiltFrame, id: string) => {
  const found = built.fields.find((f) => f.id === id);
  if (found === undefined) throw new Error(`no field ${id}`);
  return found;
};

const bytesOf = (built: BuiltFrame, id: string): number[] => {
  const f = field(built, id);
  return Array.from(built.bytes.slice(f.offset, f.offset + f.length));
};

const layerBytes = (built: BuiltFrame, layer: string): number[] => {
  const span = built.layers.find((s) => s.layer === layer);
  if (span === undefined) throw new Error(`no layer ${layer}`);
  return Array.from(built.bytes.slice(span.offset, span.offset + span.length));
};

/** Every byte in exactly one field, in order, nothing left over. */
function expectContiguous(built: BuiltFrame): void {
  let at = 0;
  for (const f of built.fields) {
    expect(f.offset).toBe(at);
    expect(f.length).toBeGreaterThan(0);
    at += f.length;
  }
  expect(at).toBe(built.bytes.length);
}

const pseudo = (src: string, dst: string, proto: number, length: number): number[] => [
  ...src.split(".").map(Number),
  ...dst.split(".").map(Number),
  0,
  proto,
  length >> 8,
  length & 255,
];

describe("an ARP request", () => {
  const built = buildFrame(ARP_REQUEST);

  it("is 60 bytes: Ethernet, ARP, and the padding a short frame gets", () => {
    expect(built.bytes.length).toBe(60);
    expectContiguous(built);
    expect(built.layers).toEqual([
      { layer: "eth", offset: 0, length: 14 },
      { layer: "arp", offset: 14, length: 28 },
      { layer: "padding", offset: 42, length: 18 },
    ]);
    expect(field(built, "padding.zeros").value).toBe("18 octets à zéro");
  });

  it("names the broadcast, the EtherType and the question asked", () => {
    expect(field(built, "eth.dst").value).toBe("ff:ff:ff:ff:ff:ff");
    expect(field(built, "eth.dst").meaning).toContain("diffusion");
    expect(bytesOf(built, "eth.src")).toEqual([0x08, 0x00, 0x27, 0x4e, 0x66, 0xa1]);
    expect(field(built, "eth.type").value).toBe("0x0806 : ARP");
    expect(bytesOf(built, "eth.type")).toEqual([0x08, 0x06]);
    expect(field(built, "arp.op").value).toBe("1 : requête");
    expect(field(built, "arp.op").meaning).toContain("qui possède cette adresse IP");
    expect(bytesOf(built, "arp.target_ip")).toEqual([192, 168, 1, 20]);
    expect(field(built, "arp.target_mac").meaning).toContain("Inconnue");
  });

  it("says who answers in a reply", () => {
    const reply = buildFrame(
      frame({
        eth: { src: "08:00:27:9f:aa:bb", dst: SRC_MAC },
        arp: {
          op: "reply",
          senderMac: "08:00:27:9f:aa:bb",
          senderIp: "192.168.1.20",
          targetMac: SRC_MAC,
          targetIp: "192.168.1.42",
        },
      }),
    );
    expect(field(reply, "arp.op").value).toBe("2 : réponse");
    expect(bytesOf(reply, "arp.op")).toEqual([0, 2]);
  });
});

describe("a TCP SYN", () => {
  const built = buildFrame(SYN);

  it("has a 40-byte IP packet, padded to the minimum frame", () => {
    expect(built.bytes.length).toBe(60);
    expectContiguous(built);
    expect(field(built, "ip.len").value).toBe("40 octets");
    expect(bytesOf(built, "ip.len")).toEqual([0, 40]);
    expect(field(built, "padding.zeros").length).toBe(6);
    expect(field(built, "eth.type").value).toBe("0x0800 : IPv4");
    expect(field(built, "ip.proto").value).toBe("6 : TCP");
  });

  it("carries an IP header checksum a router would accept", () => {
    expect(internetChecksum(layerBytes(built, "ip"))).toBe(0);
    expect(bytesOf(built, "ip.version")).toEqual([0x45]);
    expect(bytesOf(built, "ip.flags")).toEqual([0x40, 0x00]);
    expect(bytesOf(built, "ip.ttl")).toEqual([64]);
    expect(bytesOf(built, "ip.id")).toEqual([0x1c, 0x46]);
    expect(bytesOf(built, "ip.dst")).toEqual([93, 184, 216, 34]);
  });

  it("carries a TCP checksum that verifies with the pseudo-header", () => {
    const segment = layerBytes(built, "tcp");
    expect(segment).toHaveLength(20);
    expect(internetChecksum([...pseudo("192.168.1.42", "93.184.216.34", 6, 20), ...segment])).toBe(
      0,
    );
  });

  it("reads the ports and the flags the way the lesson says them", () => {
    expect(field(built, "tcp.sport").value).toBe("50324");
    expect(field(built, "tcp.sport").meaning).toContain("éphémère");
    expect(field(built, "tcp.dport").value).toBe("443 : HTTPS");
    expect(bytesOf(built, "tcp.dport")).toEqual([0x01, 0xbb]);
    expect(field(built, "tcp.flags").value).toBe("En-tête de 20 octets ; SYN");
    expect(bytesOf(built, "tcp.flags")).toEqual([0x50, 0x02]);
    expect(field(built, "tcp.flags").meaning).toContain("premier temps");
    expect(bytesOf(built, "tcp.seq")).toEqual([0, 0, 0x03, 0xe8]);
    expect(field(built, "tcp.window").value).toBe("64240 octets");
  });

  it("names the other steps of the handshake and the end of a connection", () => {
    const flagsOf = (flags: string[]) =>
      field(buildFrame(frame({ ...SYN, tcp: { ...SYN.tcp, flags } })), "tcp.flags");
    expect(flagsOf(["SYN", "ACK"]).value).toBe("En-tête de 20 octets ; SYN, ACK");
    expect(flagsOf(["SYN", "ACK"]).meaning).toContain("deuxième temps");
    expect(flagsOf(["ACK"]).meaning).toContain("accusé de réception");
    expect(flagsOf(["FIN", "ACK"]).meaning).toContain("fermer");
    expect(flagsOf(["RST"]).meaning).toContain("refusée");
  });
});

describe("an HTTP request over TCP", () => {
  const built = buildFrame(GET);

  it("carries the text as its bytes, with no padding once the frame is long enough", () => {
    expect(built.bytes.length).toBe(14 + 20 + 20 + HTTP.length);
    expectContiguous(built);
    expect(built.layers.map((s) => s.layer)).toEqual(["eth", "ip", "tcp", "payload"]);
    expect(bytesOf(built, "payload.data")).toEqual(Array.from(HTTP, (c) => c.charCodeAt(0)));
    expect(field(built, "ip.len").value).toBe(`${String(40 + HTTP.length)} octets`);
  });

  it("shows the request with its line breaks written out, and says what it is", () => {
    expect(field(built, "payload.data").value).toBe(
      "GET / HTTP/1.1\\r\\nHost: example.com\\r\\n\\r\\n",
    );
    expect(field(built, "payload.data").meaning).toContain("requête HTTP");
    expect(field(built, "tcp.flags").value).toBe("En-tête de 20 octets ; ACK, PSH");
    expect(field(built, "tcp.flags").meaning).toContain("PSH");
    expect(field(built, "tcp.dport").value).toBe("80 : HTTP");
  });

  it("checksums the data too", () => {
    const segment = [...layerBytes(built, "tcp"), ...layerBytes(built, "payload")];
    expect(
      internetChecksum([...pseudo("192.168.1.42", "93.184.216.34", 6, segment.length), ...segment]),
    ).toBe(0);
    expect(internetChecksum(layerBytes(built, "ip"))).toBe(0);
  });

  it("writes a response as HTTP too, and anything else as plain data", () => {
    const response = buildFrame(frame({ ...GET, payload: "HTTP/1.1 200 OK\r\n" }));
    expect(field(response, "payload.data").meaning).toContain("réponse HTTP");
    const chat = buildFrame(frame({ ...GET, payload: "salut é" }));
    expect(field(chat, "payload.data").meaning).toContain("TCP ne le lit pas");
    expect(bytesOf(chat, "payload.data").slice(-2)).toEqual([0xc3, 0xa9]);
  });
});

describe("UDP and ICMP", () => {
  it("writes a datagram with its length and a checksum that verifies", () => {
    const built = buildFrame(
      frame({
        eth: { src: SRC_MAC, dst: GATEWAY_MAC },
        ip: { src: "192.168.1.42", dst: "192.168.1.1" },
        udp: { sport: 41000, dport: 53 },
        payload: "example.com",
      }),
    );
    expectContiguous(built);
    expect(field(built, "udp.len").value).toBe("19 octets");
    expect(field(built, "udp.dport").value).toBe("53 : DNS");
    expect(field(built, "ip.proto").value).toBe("17 : UDP");
    const datagram = [...layerBytes(built, "udp"), ...layerBytes(built, "payload")];
    expect(internetChecksum([...pseudo("192.168.1.42", "192.168.1.1", 17, 19), ...datagram])).toBe(
      0,
    );
  });

  it("writes a ping and its reply", () => {
    const spec = {
      eth: { src: SRC_MAC, dst: GATEWAY_MAC },
      ip: { src: "192.168.1.42", dst: "192.168.1.1" },
      icmp: { type: "echo-request", id: 4242, seq: 3 },
      payload: "abcdefgh",
    };
    const request = buildFrame(frame(spec));
    expect(field(request, "icmp.type").value).toBe("8 : demande d'écho");
    expect(bytesOf(request, "icmp.id")).toEqual([0x10, 0x92]);
    expect(field(request, "icmp.seq").meaning).toContain("icmp_seq");
    expect(
      internetChecksum([...layerBytes(request, "icmp"), ...layerBytes(request, "payload")]),
    ).toBe(0);
    const reply = buildFrame(frame({ ...spec, icmp: { ...spec.icmp, type: "echo-reply" } }));
    expect(field(reply, "icmp.type").value).toBe("0 : réponse d'écho");
    expect(bytesOf(reply, "icmp.type")).toEqual([0]);
  });
});

describe("the frame check sequence", () => {
  it("is Ethernet's CRC-32, appended low byte first", () => {
    expect(crc32(Array.from("123456789", (c) => c.charCodeAt(0)))).toBe(0xcbf43926);
    const built = buildFrame({ ...ARP_REQUEST, fcs: true });
    expect(built.bytes.length).toBe(64);
    const crc = crc32(Array.from(built.bytes.slice(0, 60)));
    expect(Array.from(built.bytes.slice(60))).toEqual([
      crc & 255,
      (crc >>> 8) & 255,
      (crc >>> 16) & 255,
      (crc >>> 24) & 255,
    ]);
    expect(field(built, "fcs.crc").meaning).toContain("jetée");
  });
});

describe("reading the frame", () => {
  const built = buildFrame(SYN);

  it("finds the field a byte belongs to", () => {
    expect(fieldAt(built, 0)?.id).toBe("eth.dst");
    expect(fieldAt(built, 13)?.id).toBe("eth.type");
    expect(fieldAt(built, 22)?.id).toBe("ip.ttl");
    expect(fieldAt(built, 30)?.id).toBe("ip.dst");
    expect(fieldAt(built, 47)?.id).toBe("tcp.flags");
    expect(fieldAt(built, 59)?.id).toBe("padding.zeros");
    expect(fieldAt(built, 60)).toBeUndefined();
  });

  it("says which fields an author asks for that the frame does not have", () => {
    expect(missingFields(built, ["ip.dst", "tcp.flags"])).toEqual([]);
    expect(missingFields(built, ["udp.len", "arp.op", "ip.ttl"])).toEqual(["udp.len", "arp.op"]);
  });

  it("dumps bytes in hexadecimal and writes control characters out", () => {
    expect(hexOf(built.bytes).slice(12, 16)).toEqual(["08", "00", "45", "00"]);
    expect(escapeText("a\tb\r\nc\x01")).toBe("a\\tb\\r\\nc\\x01");
  });
});
