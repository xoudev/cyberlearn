import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { CosmeticType } from "@cyberlearn/db";
import { equipCosmeticForUser, unequipCosmeticForUser } from "@/lib/cosmetics/equip";
import { userFromBearer } from "../_lib/auth";

const schema = z.union([
  z.object({ action: z.literal("equip"), code: z.string().trim().min(1).max(40) }),
  z.object({
    action: z.literal("unequip"),
    type: z.enum(["TERMINAL_THEME", "HEXAGON_STYLE", "PROFILE_FRAME", "ACCENT_COLOR"]),
  }),
]);

/**
 * Equip / unequip a cosmetic for the authenticated mobile user. Same guarded
 * flow as the web casier action (server-side ownership check) - RLS keeps
 * user_cosmetic_loadouts read-only for clients.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  try {
    const result =
      parsed.data.action === "equip"
        ? await equipCosmeticForUser(user.id, parsed.data.code)
        : // SAFETY: z.enum above matches COSMETIC_TYPES values exactly
          await unequipCosmeticForUser(user.id, parsed.data.type as CosmeticType);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error("[mobile/loadout] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: "Opération impossible." }, { status: 500 });
  }
}
