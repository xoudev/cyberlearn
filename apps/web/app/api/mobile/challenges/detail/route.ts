import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { challengeDetailFor } from "@/lib/challenges/catalogue";
import { userFromBearer } from "../../_lib/auth";

const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(100);

/**
 * One challenge for the app: its statement, where the caller stands, and the
 * hints they have revealed. Never the flag, nor the machine's files: a
 * machine is played on the site.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const slug = slugSchema.safeParse(request.nextUrl.searchParams.get("slug"));
  if (!slug.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }
  const challenge = await challengeDetailFor(user.id, slug.data);
  if (!challenge) {
    return NextResponse.json({ ok: false, error: "Défi introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, challenge });
}
