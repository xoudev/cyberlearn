import { z } from "zod";

/**
 * <NetworkLab>: a small network the learner wires and configures on a canvas
 * (PCs, switches, routers), then tests with ping. The engine lives in
 * @cyberlearn/lib/network; the site, the app (which shows it as a card) and
 * the lesson check read the props through this schema. What the schema cannot
 * see (a cable to a device that does not exist, an address that does not
 * parse) is checked by the engine's buildNetwork.
 */

const IP = /^\d{1,3}(?:\.\d{1,3}){3}$/u;
const CIDR = /^\d{1,3}(?:\.\d{1,3}){3}\/\d{1,2}$/u;
const deviceId = z.string().regex(/^[a-z][a-z0-9-]{0,19}$/u, "identifiant d'appareil invalide.");
const deviceName = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9-]{0,15}$/u,
    "nom d'appareil invalide (lettres, chiffres, tirets).",
  );
const ip = z.string().regex(IP, "adresse IP invalide.");
const cidr = z.string().regex(CIDR, "adresse attendue avec son préfixe : 192.168.1.10/24.");

export const networkDeviceSchema = z
  .object({
    id: deviceId,
    kind: z.enum(["pc", "switch", "router"]),
    name: deviceName,
    /** Where it sits on the canvas. */
    x: z.number().min(0).max(2000),
    y: z.number().min(0).max(2000),
    /** By port: { "eth0": "192.168.1.10/24" }; eth0 for a PC, eth0 to eth3 for a router. */
    addresses: z.record(z.string().regex(/^eth[0-3]$/u, "port inconnu."), cidr).optional(),
    gateway: ip.optional(),
    routes: z
      .array(z.object({ to: cidr, via: ip }).strict())
      .max(8)
      .optional(),
  })
  .strict();

export type NetworkDevice = z.infer<typeof networkDeviceSchema>;

const label = z.string().trim().min(1).max(200);

/**
 * What the learner must achieve, checked after every change:
 *
 * - `ping`: a ping from a device (its name) to an address or a device's name
 *   comes back;
 * - `address`: a device has an address in the subnet, with that prefix;
 * - `gateway`: a PC's default gateway is that address;
 * - `route`: a router has a static route to that subnet (0.0.0.0/0 for the
 *   default route), through `via` if given;
 * - `link`: two devices are cabled together;
 * - `count`: at least `min` devices of a kind exist.
 */
export const networkCheckSchema = z.discriminatedUnion("expect", [
  z.object({
    label,
    expect: z.literal("ping"),
    from: deviceName,
    to: z.string().trim().min(1).max(40),
  }),
  z.object({ label, expect: z.literal("address"), device: deviceName, in: cidr }),
  z.object({ label, expect: z.literal("gateway"), device: deviceName, is: ip }),
  z.object({ label, expect: z.literal("route"), device: deviceName, to: cidr, via: ip.optional() }),
  z.object({ label, expect: z.literal("link"), between: z.tuple([deviceName, deviceName]) }),
  z.object({
    label,
    expect: z.literal("count"),
    kind: z.enum(["pc", "switch", "router"]),
    min: z.number().int().min(1).max(12),
  }),
]);

export type NetworkCheck = z.infer<typeof networkCheckSchema>;

export const networkLabSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().trim().min(1).max(120).optional(),
  task: z.string().trim().min(1).max(800),
  devices: z.array(networkDeviceSchema).min(1).max(12),
  /** Cables, by device ids. */
  links: z
    .array(z.tuple([deviceId, deviceId]))
    .max(20)
    .default([]),
  checks: z.array(networkCheckSchema).max(12).optional(),
  hints: z.array(z.string().trim().min(1).max(400)).max(8).optional(),
  /** True: the learner configures the devices but adds or removes none, nor any cable. */
  locked: z.boolean().default(false),
});

export type NetworkLab = z.infer<typeof networkLabSchema>;

type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

export function parseNetworkLab(raw: unknown): Parsed<NetworkLab> {
  const parsed = networkLabSchema.safeParse(raw);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issue = parsed.error.issues[0];
  const where = issue?.path.length ? `${issue.path.join(".")} : ` : "";
  return { ok: false, problem: `${where}${issue?.message ?? "props invalides."}` };
}
