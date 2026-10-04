import type { PacketFrame, TcpFlag } from "@cyberlearn/types";

/**
 * <PacketDissector>: the bytes of one frame, and what each of them is. The
 * author describes the frame (addresses, ports, flags, the text carried) and
 * this writes it as it would go on the wire: Ethernet II, then ARP, or IPv4
 * with TCP, UDP or ICMP, the checksums computed, the padding a short frame
 * gets, the frame check sequence when asked. Each field knows its bytes, its
 * value and what it means, in French, so a click on a byte can say which
 * field it belongs to and why it is there.
 *
 * Pure: the site and the app build the same frame from the same description,
 * and the tests check the checksums the way a receiver would.
 */

export type PacketLayer =
  | "eth"
  | "arp"
  | "ip"
  | "tcp"
  | "udp"
  | "icmp"
  | "payload"
  | "padding"
  | "fcs";

export interface PacketField {
  /** layer.field: "ip.ttl", "tcp.flags". */
  readonly id: string;
  readonly layer: PacketLayer;
  /** The field's name, in French. */
  readonly name: string;
  readonly offset: number;
  readonly length: number;
  /** The value as a reader would say it: "64", "0x0800 : IPv4", "ff:ff:ff:ff:ff:ff". */
  readonly value: string;
  /** What the field is for, and what this value means here. */
  readonly meaning: string;
}

export interface PacketLayerSpan {
  readonly layer: PacketLayer;
  readonly offset: number;
  readonly length: number;
}

export interface BuiltFrame {
  readonly bytes: Uint8Array;
  readonly fields: readonly PacketField[];
  /** The layers in wire order, each with the bytes it spans. */
  readonly layers: readonly PacketLayerSpan[];
}

export const LAYER_NAMES: Record<PacketLayer, string> = {
  eth: "Ethernet",
  arp: "ARP",
  ip: "IP",
  tcp: "TCP",
  udp: "UDP",
  icmp: "ICMP",
  payload: "Données",
  padding: "Bourrage",
  fcs: "FCS",
};

const ETHER_TYPES: Record<number, string> = { 0x0800: "IPv4", 0x0806: "ARP", 0x86dd: "IPv6" };
const IP_PROTOCOLS: Record<number, string> = { 1: "ICMP", 6: "TCP", 17: "UDP" };

/** The services behind the ports the lessons name. */
export const KNOWN_PORTS: Record<number, string> = {
  20: "FTP (données)",
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  67: "DHCP (serveur)",
  68: "DHCP (client)",
  80: "HTTP",
  110: "POP3",
  123: "NTP",
  143: "IMAP",
  443: "HTTPS",
  3306: "MySQL",
  5432: "PostgreSQL",
  8080: "HTTP (autre port)",
};

const TCP_FLAG_BITS: Record<TcpFlag, number> = {
  FIN: 1,
  SYN: 2,
  RST: 4,
  PSH: 8,
  ACK: 16,
  URG: 32,
};

/** A frame shorter than this gets padding: Ethernet's minimum, without the FCS. */
const MIN_FRAME = 60;

// ── Bytes ────────────────────────────────────────────────────────────────────

const hex2 = (n: number): string => n.toString(16).padStart(2, "0");
const hex4 = (n: number): string => `0x${n.toString(16).padStart(4, "0")}`;
const u16 = (n: number): number[] => [(n >>> 8) & 255, n & 255];
const u32 = (n: number): number[] => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const macBytes = (mac: string): number[] => mac.split(":").map((h) => parseInt(h, 16));
const ipBytes = (ip: string): number[] => ip.split(".").map(Number);
const macText = (bytes: number[]): string => bytes.map(hex2).join(":");

/** Each byte in hexadecimal, as a dump shows them. */
export function hexOf(bytes: Uint8Array): string[] {
  return Array.from(bytes, hex2);
}

/** UTF-8, written by hand: the app's JavaScript engine has no TextEncoder to count on. */
function utf8(text: string): number[] {
  const out: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    }
  }
  return out;
}

/** The text with its control characters written out: a line break reads \r\n. */
export function escapeText(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (char === "\r") out += "\\r";
    else if (char === "\n") out += "\\n";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\x${hex2(code)}`;
    else out += char;
  }
  return out;
}

/** The Internet checksum (RFC 1071): the one's complement of the one's complement sum of 16-bit words. */
export function internetChecksum(bytes: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < bytes.length; i += 2) {
    sum += ((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0);
  }
  while (sum > 0xffff) sum = (sum & 0xffff) + (sum >>> 16);
  return ~sum & 0xffff;
}

/** CRC-32 as Ethernet uses it (reflected, polynomial 0xEDB88320). */
export function crc32(bytes: readonly number[]): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Writing ──────────────────────────────────────────────────────────────────

class Writer {
  readonly bytes: number[] = [];
  readonly fields: PacketField[] = [];

  add(
    layer: PacketLayer,
    field: string,
    name: string,
    data: readonly number[],
    value: string,
    meaning: string,
  ): PacketField {
    const written: PacketField = {
      id: `${layer}.${field}`,
      layer,
      name,
      offset: this.bytes.length,
      length: data.length,
      value,
      meaning,
    };
    this.bytes.push(...data);
    this.fields.push(written);
    return written;
  }

  /** A checksum is written as zero first, then set once the rest is known. */
  patch(field: PacketField, data: readonly number[], value: string): void {
    data.forEach((byte, i) => {
      this.bytes[field.offset + i] = byte;
    });
    const at = this.fields.indexOf(field);
    if (at !== -1) this.fields[at] = { ...field, value };
  }

  slice(from: number, to = this.bytes.length): number[] {
    return this.bytes.slice(from, to);
  }
}

function portMeaning(port: number, side: "source" | "destination"): string {
  const service = KNOWN_PORTS[port];
  if (service !== undefined) {
    return `${String(port)} : ${service}. Le port de ${side} dit quelle application reçoit ces octets sur la machine.`;
  }
  if (port >= 1024) {
    return `${String(port)} : un port éphémère, pioché dans les numéros hauts pour la durée de l'échange. C'est par lui que la réponse retrouvera l'application.`;
  }
  return `${String(port)} : un port réservé (0 à 1023), sans service connu ici.`;
}

function portValue(port: number): string {
  const service = KNOWN_PORTS[port];
  return service === undefined ? String(port) : `${String(port)} : ${service}`;
}

function writeEthernet(w: Writer, eth: PacketFrame["eth"], etherType: number): void {
  const dst = macBytes(eth.dst);
  const broadcast = dst.every((b) => b === 255);
  w.add(
    "eth",
    "dst",
    "Adresse MAC de destination",
    dst,
    macText(dst),
    broadcast
      ? "ff:ff:ff:ff:ff:ff est l'adresse de diffusion : toutes les machines du segment lisent cette trame."
      : "La carte réseau qui doit lire cette trame, sur le segment local : le prochain saut, pas la destination finale.",
  );
  const src = macBytes(eth.src);
  w.add(
    "eth",
    "src",
    "Adresse MAC source",
    src,
    macText(src),
    "La carte qui a émis la trame. Les trois premières paires désignent le fabricant, les trois dernières la carte.",
  );
  w.add(
    "eth",
    "type",
    "EtherType",
    u16(etherType),
    `${hex4(etherType)} : ${ETHER_TYPES[etherType] ?? "inconnu"}`,
    "Ce que la trame transporte, pour que le destinataire sache à quelle couche passer la suite.",
  );
}

function writeArp(w: Writer, arp: NonNullable<PacketFrame["arp"]>): void {
  w.add(
    "arp",
    "htype",
    "Type de matériel",
    u16(1),
    "1 : Ethernet",
    "Le type d'adresse matérielle en jeu.",
  );
  w.add(
    "arp",
    "ptype",
    "Type de protocole",
    u16(0x0800),
    "0x0800 : IPv4",
    "Le type d'adresse logique à résoudre.",
  );
  w.add(
    "arp",
    "hlen",
    "Longueur d'adresse matérielle",
    [6],
    "6 octets",
    "Une adresse MAC fait 6 octets.",
  );
  w.add(
    "arp",
    "plen",
    "Longueur d'adresse logique",
    [4],
    "4 octets",
    "Une adresse IPv4 fait 4 octets.",
  );
  const request = arp.op === "request";
  w.add(
    "arp",
    "op",
    "Opération",
    u16(request ? 1 : 2),
    request ? "1 : requête" : "2 : réponse",
    request
      ? "La question posée à tout le segment : « qui possède cette adresse IP ? »"
      : "La réponse, envoyée directement à celui qui demandait : « c'est moi, voici ma MAC ».",
  );
  const senderMac = macBytes(arp.senderMac);
  w.add(
    "arp",
    "sender_mac",
    "MAC de l'émetteur",
    senderMac,
    macText(senderMac),
    "La MAC de celui qui parle. Le destinataire la note dans sa table ARP, en face de l'IP qui suit.",
  );
  w.add(
    "arp",
    "sender_ip",
    "IP de l'émetteur",
    ipBytes(arp.senderIp),
    arp.senderIp,
    "L'adresse IP de celui qui parle.",
  );
  const targetMac = macBytes(arp.targetMac);
  w.add(
    "arp",
    "target_mac",
    "MAC de la cible",
    targetMac,
    macText(targetMac),
    request
      ? "Inconnue, c'est justement ce qu'on cherche : des zéros, en attendant la réponse."
      : "La MAC de celui qui avait demandé.",
  );
  w.add(
    "arp",
    "target_ip",
    "IP de la cible",
    ipBytes(arp.targetIp),
    arp.targetIp,
    request
      ? "L'adresse IP dont on veut la MAC. Seule la machine qui la porte répondra."
      : "L'adresse IP de celui qui avait demandé.",
  );
}

function writeIp(
  w: Writer,
  ip: NonNullable<PacketFrame["ip"]>,
  protocol: number,
  restLength: number,
): void {
  const start = w.bytes.length;
  const total = 20 + restLength;
  w.add(
    "ip",
    "version",
    "Version et longueur d'en-tête",
    [0x45],
    "Version 4, en-tête de 5 mots (20 octets)",
    "Le premier demi-octet dit IPv4 ; le second, la taille de l'en-tête en mots de 32 bits : 5, soit 20 octets, sans option.",
  );
  w.add(
    "ip",
    "tos",
    "Type de service",
    [0],
    "0",
    "La priorité demandée pour ce paquet : aucune en particulier.",
  );
  w.add(
    "ip",
    "len",
    "Longueur totale",
    u16(total),
    `${String(total)} octets`,
    "L'en-tête IP et tout ce qu'il transporte, sans l'en-tête Ethernet.",
  );
  w.add(
    "ip",
    "id",
    "Identification",
    u16(ip.id),
    String(ip.id),
    "Un numéro propre au paquet, qui sert à rassembler ses fragments si un routeur a dû le couper.",
  );
  w.add(
    "ip",
    "flags",
    "Drapeaux et décalage de fragment",
    u16(ip.dontFragment ? 0x4000 : 0),
    ip.dontFragment ? "DF (ne pas fragmenter), décalage 0" : "aucun drapeau, décalage 0",
    ip.dontFragment
      ? "DF interdit aux routeurs de couper ce paquet : trop gros, il est jeté et l'émetteur prévenu."
      : "Un routeur peut couper ce paquet en fragments ; le décalage dit où chacun se place.",
  );
  w.add(
    "ip",
    "ttl",
    "Durée de vie (TTL)",
    [ip.ttl],
    String(ip.ttl),
    "Baisse de un à chaque routeur traversé ; à zéro, le paquet est jeté et l'émetteur prévenu. Un paquet ne tourne jamais sans fin.",
  );
  w.add(
    "ip",
    "proto",
    "Protocole",
    [protocol],
    `${String(protocol)} : ${IP_PROTOCOLS[protocol] ?? "inconnu"}`,
    "Ce que le paquet transporte, pour que la machine d'arrivée sache à qui passer la suite.",
  );
  const checksum = w.add(
    "ip",
    "checksum",
    "Somme de contrôle de l'en-tête",
    u16(0),
    "",
    "Calculée sur l'en-tête IP seul, et refaite par chaque routeur puisque le TTL change. Un en-tête abîmé est jeté.",
  );
  w.add(
    "ip",
    "src",
    "Adresse IP source",
    ipBytes(ip.src),
    ip.src,
    "La machine qui a émis le paquet, de bout en bout : elle ne change pas en route.",
  );
  w.add(
    "ip",
    "dst",
    "Adresse IP de destination",
    ipBytes(ip.dst),
    ip.dst,
    "La destination finale, de bout en bout. C'est elle que chaque routeur regarde pour choisir la direction.",
  );
  const sum = internetChecksum(w.slice(start, start + 20));
  w.patch(checksum, u16(sum), hex4(sum));
}

/** The pseudo-header TCP and UDP add to their checksum: the IP addresses, the protocol, the length. */
function pseudoHeader(
  ip: NonNullable<PacketFrame["ip"]>,
  protocol: number,
  length: number,
): number[] {
  return [...ipBytes(ip.src), ...ipBytes(ip.dst), 0, protocol, ...u16(length)];
}

function flagsText(flags: readonly TcpFlag[]): string {
  const order: TcpFlag[] = ["SYN", "ACK", "PSH", "FIN", "RST", "URG"];
  return order.filter((f) => flags.includes(f)).join(", ");
}

function flagsMeaning(flags: readonly TcpFlag[]): string {
  const has = (f: TcpFlag): boolean => flags.includes(f);
  if (has("RST")) return "RST : la connexion est refusée ou rompue, sans discussion.";
  if (has("SYN") && has("ACK")) {
    return "SYN-ACK, le deuxième temps de la poignée de main : le serveur accuse réception du SYN et demande l'ouverture à son tour.";
  }
  if (has("SYN")) {
    return "SYN, le premier temps de la poignée de main : « je veux établir une connexion, voici mon numéro de départ ».";
  }
  if (has("FIN"))
    return "FIN : l'émetteur n'a plus rien à envoyer et demande à fermer son sens de la connexion.";
  if (has("PSH")) {
    return "PSH avec ACK : des données à remettre tout de suite à l'application, sans attendre d'en avoir plus.";
  }
  return "ACK seul : un accusé de réception, le numéro d'acquittement dit jusqu'où tout est bien arrivé.";
}

function writeTcp(
  w: Writer,
  ip: NonNullable<PacketFrame["ip"]>,
  tcp: NonNullable<PacketFrame["tcp"]>,
  payload: readonly number[],
): void {
  const start = w.bytes.length;
  w.add(
    "tcp",
    "sport",
    "Port source",
    u16(tcp.sport),
    portValue(tcp.sport),
    portMeaning(tcp.sport, "source"),
  );
  w.add(
    "tcp",
    "dport",
    "Port de destination",
    u16(tcp.dport),
    portValue(tcp.dport),
    portMeaning(tcp.dport, "destination"),
  );
  w.add(
    "tcp",
    "seq",
    "Numéro de séquence",
    u32(tcp.seq),
    String(tcp.seq),
    "Le rang du premier octet de ce segment dans le flux : c'est ce qui permet de remettre les morceaux dans l'ordre.",
  );
  w.add(
    "tcp",
    "ack",
    "Numéro d'acquittement",
    u32(tcp.ack),
    String(tcp.ack),
    "Le prochain octet attendu de l'autre côté : tout ce qui précède est bien arrivé.",
  );
  const bits = tcp.flags.reduce((acc, f) => acc | TCP_FLAG_BITS[f], 0);
  w.add(
    "tcp",
    "flags",
    "Longueur d'en-tête et drapeaux",
    [0x50, bits],
    `En-tête de 20 octets ; ${flagsText(tcp.flags)}`,
    flagsMeaning(tcp.flags),
  );
  w.add(
    "tcp",
    "window",
    "Fenêtre",
    u16(tcp.window),
    `${String(tcp.window)} octets`,
    "Ce que l'émetteur peut encore recevoir sans accusé : le contrôle de flux, pour ne pas noyer l'autre.",
  );
  const checksum = w.add(
    "tcp",
    "checksum",
    "Somme de contrôle",
    u16(0),
    "",
    "Calculée sur l'en-tête TCP, les données et un pseudo-en-tête fait des deux adresses IP : un segment livré à la mauvaise machine est détecté.",
  );
  w.add(
    "tcp",
    "urgent",
    "Pointeur urgent",
    u16(0),
    "0",
    "Inutilisé ici : pas de données urgentes.",
  );
  const segment = w.slice(start);
  const sum = internetChecksum([
    ...pseudoHeader(ip, 6, segment.length + payload.length),
    ...segment,
    ...payload,
  ]);
  w.patch(checksum, u16(sum), hex4(sum));
}

function writeUdp(
  w: Writer,
  ip: NonNullable<PacketFrame["ip"]>,
  udp: NonNullable<PacketFrame["udp"]>,
  payload: readonly number[],
): void {
  const start = w.bytes.length;
  const length = 8 + payload.length;
  w.add(
    "udp",
    "sport",
    "Port source",
    u16(udp.sport),
    portValue(udp.sport),
    portMeaning(udp.sport, "source"),
  );
  w.add(
    "udp",
    "dport",
    "Port de destination",
    u16(udp.dport),
    portValue(udp.dport),
    portMeaning(udp.dport, "destination"),
  );
  w.add(
    "udp",
    "len",
    "Longueur",
    u16(length),
    `${String(length)} octets`,
    "L'en-tête UDP (8 octets) et les données. C'est tout ce qu'UDP ajoute : ni numéro, ni accusé, ni connexion.",
  );
  const checksum = w.add(
    "udp",
    "checksum",
    "Somme de contrôle",
    u16(0),
    "",
    "Calculée sur l'en-tête, les données et un pseudo-en-tête fait des deux adresses IP.",
  );
  const sum = internetChecksum([...pseudoHeader(ip, 17, length), ...w.slice(start), ...payload]);
  const stored = sum === 0 ? 0xffff : sum;
  w.patch(checksum, u16(stored), hex4(stored));
}

function writeIcmp(
  w: Writer,
  icmp: NonNullable<PacketFrame["icmp"]>,
  payload: readonly number[],
): void {
  const start = w.bytes.length;
  const request = icmp.type === "echo-request";
  w.add(
    "icmp",
    "type",
    "Type",
    [request ? 8 : 0],
    request ? "8 : demande d'écho" : "0 : réponse d'écho",
    request
      ? "Ce que ping envoie : « es-tu là ? ». La machine visée doit renvoyer les mêmes octets."
      : "Ce que ping reçoit : la machine visée renvoie les octets reçus, et ping mesure l'aller-retour.",
  );
  w.add(
    "icmp",
    "code",
    "Code",
    [0],
    "0",
    "Précise le type ; pour un écho, il n'y a rien à préciser.",
  );
  const checksum = w.add(
    "icmp",
    "checksum",
    "Somme de contrôle",
    u16(0),
    "",
    "Calculée sur tout le message ICMP.",
  );
  w.add(
    "icmp",
    "id",
    "Identifiant",
    u16(icmp.id),
    String(icmp.id),
    "Distingue plusieurs ping lancés en même temps : chacun reconnaît ses réponses.",
  );
  w.add(
    "icmp",
    "seq",
    "Numéro de séquence",
    u16(icmp.seq),
    String(icmp.seq),
    "Augmente de un à chaque envoi : c'est le icmp_seq que ping affiche, qui montre les pertes.",
  );
  const sum = internetChecksum([...w.slice(start), ...payload]);
  w.patch(checksum, u16(sum), hex4(sum));
}

const HTTP_METHOD = /^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) /u;

function writePayload(w: Writer, text: string, over: "tcp" | "udp" | "icmp"): void {
  const data = utf8(text);
  let meaning: string;
  if (over === "icmp") {
    meaning = "Des octets quelconques, que la réponse d'écho renvoie à l'identique.";
  } else if (HTTP_METHOD.test(text)) {
    meaning =
      "Ce que l'application envoie, tel quel : ici une requête HTTP, la méthode, le chemin et la version, puis des en-têtes, et une ligne vide pour finir. TCP ne la lit pas, il la transporte.";
  } else if (text.startsWith("HTTP/")) {
    meaning =
      "Ce que l'application envoie, tel quel : ici une réponse HTTP, la version, le code et son résumé, puis des en-têtes. TCP ne la lit pas, il la transporte.";
  } else {
    meaning = `Ce que l'application envoie, tel quel. ${over === "tcp" ? "TCP" : "UDP"} ne le lit pas, il le transporte.`;
  }
  w.add("payload", "data", "Données", data, escapeText(text), meaning);
}

function writePadding(w: Writer): void {
  const missing = MIN_FRAME - w.bytes.length;
  if (missing <= 0) return;
  w.add(
    "padding",
    "zeros",
    "Bourrage",
    new Array<number>(missing).fill(0),
    `${String(missing)} octets à zéro`,
    "Une trame Ethernet fait 60 octets au minimum (64 avec le FCS) : la carte complète avec des zéros, que le destinataire ignore.",
  );
}

function writeFcs(w: Writer): void {
  const crc = crc32(w.bytes);
  const data = [crc & 255, (crc >>> 8) & 255, (crc >>> 16) & 255, (crc >>> 24) & 255];
  w.add(
    "fcs",
    "crc",
    "Séquence de contrôle de trame (FCS)",
    data,
    `CRC-32 ${data.map(hex2).join(" ")}`,
    "Calculée par la carte sur toute la trame à l'envoi, vérifiée à l'arrivée : une trame abîmée en route est jetée sans un mot.",
  );
}

// ── The frame ────────────────────────────────────────────────────────────────

/** The frame as it goes on the wire, with every field named. */
export function buildFrame(frame: PacketFrame): BuiltFrame {
  const w = new Writer();
  if (frame.arp !== undefined) {
    writeEthernet(w, frame.eth, 0x0806);
    writeArp(w, frame.arp);
  } else if (frame.ip !== undefined) {
    writeEthernet(w, frame.eth, 0x0800);
    const payload = utf8(frame.payload ?? "");
    if (frame.tcp !== undefined) {
      writeIp(w, frame.ip, 6, 20 + payload.length);
      writeTcp(w, frame.ip, frame.tcp, payload);
      if (frame.payload !== undefined && frame.payload !== "")
        writePayload(w, frame.payload, "tcp");
    } else if (frame.udp !== undefined) {
      writeIp(w, frame.ip, 17, 8 + payload.length);
      writeUdp(w, frame.ip, frame.udp, payload);
      if (frame.payload !== undefined && frame.payload !== "")
        writePayload(w, frame.payload, "udp");
    } else if (frame.icmp !== undefined) {
      writeIp(w, frame.ip, 1, 8 + payload.length);
      writeIcmp(w, frame.icmp, payload);
      if (frame.payload !== undefined && frame.payload !== "")
        writePayload(w, frame.payload, "icmp");
    }
  }
  writePadding(w);
  if (frame.fcs) writeFcs(w);
  return { bytes: Uint8Array.from(w.bytes), fields: w.fields, layers: spansOf(w.fields) };
}

function spansOf(fields: readonly PacketField[]): PacketLayerSpan[] {
  const spans: PacketLayerSpan[] = [];
  for (const field of fields) {
    const last = spans[spans.length - 1];
    if (last !== undefined && last.layer === field.layer) {
      spans[spans.length - 1] = { ...last, length: last.length + field.length };
    } else {
      spans.push({ layer: field.layer, offset: field.offset, length: field.length });
    }
  }
  return spans;
}

/** The field a byte belongs to. */
export function fieldAt(frame: BuiltFrame, offset: number): PacketField | undefined {
  return frame.fields.find((f) => offset >= f.offset && offset < f.offset + f.length);
}

/** The fields asked for that the frame does not have: an author's mistake to report. */
export function missingFields(frame: BuiltFrame, ids: readonly string[]): string[] {
  return ids.filter((id) => !frame.fields.some((f) => f.id === id));
}
