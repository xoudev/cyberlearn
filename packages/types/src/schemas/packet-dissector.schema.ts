import { z } from "zod";

/**
 * <PacketDissector>: one frame, byte by byte, where a click on a byte names
 * the field it belongs to. The author describes the frame in plain terms (the
 * addresses, the ports, the flags, the text carried) and
 * @cyberlearn/lib/network/packet writes the bytes, checksums included, so the
 * dump is always right. The site and the app read the same description.
 */

const mac = z
  .string()
  .regex(
    /^[0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5}$/u,
    "une adresse MAC s'écrit en six paires hexadécimales séparées par des deux-points : 08:00:27:4e:66:a1.",
  );

/** Four numbers of 0 to 255: written out, so that no regex is built from a string. */
const ipv4 = z
  .string()
  .regex(
    /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/u,
    "une adresse IPv4 s'écrit en quatre nombres de 0 à 255 : 192.168.1.10.",
  );

const port = z.number().int().min(0).max(65535);
const uint16 = z.number().int().min(0).max(65535);
const uint32 = z.number().int().min(0).max(4294967295);

export const TCP_FLAGS = ["FIN", "SYN", "RST", "PSH", "ACK", "URG"] as const;
export type TcpFlag = (typeof TCP_FLAGS)[number];

export const packetFrameSchema = z
  .object({
    /** The Ethernet header: who sends, who receives, on the local segment. */
    eth: z.object({ src: mac, dst: mac }).strict(),
    /** An ARP question or answer, instead of an IP packet. */
    arp: z
      .object({
        op: z.enum(["request", "reply"]),
        senderMac: mac,
        senderIp: ipv4,
        targetMac: mac,
        targetIp: ipv4,
      })
      .strict()
      .optional(),
    ip: z
      .object({
        src: ipv4,
        dst: ipv4,
        ttl: z.number().int().min(1).max(255).default(64),
        id: uint16.default(0),
        dontFragment: z.boolean().default(true),
      })
      .strict()
      .optional(),
    tcp: z
      .object({
        sport: port,
        dport: port,
        seq: uint32.default(0),
        ack: uint32.default(0),
        flags: z.array(z.enum(TCP_FLAGS)).min(1).max(TCP_FLAGS.length).default(["ACK"]),
        window: uint16.default(65535),
      })
      .strict()
      .optional(),
    udp: z.object({ sport: port, dport: port }).strict().optional(),
    icmp: z
      .object({
        type: z.enum(["echo-request", "echo-reply"]),
        id: uint16.default(1),
        seq: uint16.default(1),
      })
      .strict()
      .optional(),
    /** What the application sends, as text: an HTTP request, a line of chat. */
    payload: z.string().max(400).optional(),
    /** Whether to show the frame check sequence the card appends. */
    fcs: z.boolean().default(false),
  })
  .strict()
  .superRefine((frame, ctx) => {
    const transports = [frame.tcp, frame.udp, frame.icmp].filter((t) => t !== undefined).length;
    if (frame.arp === undefined && frame.ip === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "une trame porte arp ou ip : il manque l'un des deux.",
      });
    } else if (frame.arp !== undefined && frame.ip !== undefined) {
      ctx.addIssue({ code: "custom", message: "une trame porte arp ou ip, pas les deux." });
    } else if (frame.arp !== undefined && (transports > 0 || frame.payload !== undefined)) {
      ctx.addIssue({
        code: "custom",
        message: "avec arp, pas de tcp, udp, icmp ni payload : ARP n'a rien au-dessus de lui.",
      });
    } else if (frame.ip !== undefined && transports === 0) {
      ctx.addIssue({ code: "custom", message: "avec ip, il faut tcp, udp ou icmp." });
    } else if (transports > 1) {
      ctx.addIssue({ code: "custom", message: "tcp, udp et icmp : un seul à la fois." });
    }
  });

export type PacketFrame = z.infer<typeof packetFrameSchema>;

/** A field to find, named layer.field: "ip.dst", "tcp.flags" (the list is in the authoring guide). */
const fieldId = z.string().regex(/^[a-z]+\.[a-z_]+$/u, "un champ se nomme couche.champ : ip.dst.");

export const packetDissectorSchema = z
  .object({
    id: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    task: z.string().trim().min(1).max(600).optional(),
    frame: packetFrameSchema,
    /** Fields the learner is asked to find by clicking their bytes. */
    find: z.array(fieldId).min(1).max(10).optional(),
  })
  .strict();

export type PacketDissector = z.infer<typeof packetDissectorSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

/** Reads the props, or says in French what is wrong, for the lesson's author. */
export function parsePacketDissector(raw: unknown): Parsed<PacketDissector> {
  const parsed = packetDissectorSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length && issue.code !== "custom" ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
