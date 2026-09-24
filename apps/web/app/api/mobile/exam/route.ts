import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { pathsVisibleTo, prisma } from "@cyberlearn/db";
import { examStatus } from "@/lib/exam/exam-service";
import { userFromBearer } from "../_lib/auth";

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

/**
 * Where a path's final exam stands for the mobile user, as the site's exam
 * page computes it (examStatus): whether there is one, whether the lessons are
 * done, an attempt to resume, the wait after the last one, the certificate.
 *
 * A route rather than reads under RLS: the answer combines the quiz, the
 * attempts and the lessons with the time limit and the 48-hour rule, and the
 * app must not rewrite those rules (docs/MOBILE_PARITY.md).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const slug = slugSchema.safeParse(request.nextUrl.searchParams.get("slug"));
  if (!slug.success) {
    return NextResponse.json({ ok: false, error: "Parcours invalide." }, { status: 400 });
  }

  // Scoped to the reader: a class path is only visible to its class.
  const path = await prisma.path.findFirst({
    where: { slug: slug.data, ...pathsVisibleTo(user.id) },
    select: { id: true, slug: true, title: true, refCode: true, audience: true },
  });
  if (!path) {
    return NextResponse.json({ ok: false, error: "Parcours introuvable." }, { status: 404 });
  }

  const status = await examStatus(user.id, path.id);
  const { audience, ...shown } = path;
  return NextResponse.json({
    ok: true,
    // A class path carries no certificate: the platform only vouches for its
    // catalogue (see findPublishedPathsForLesson and claimCertificate).
    path: { ...shown, certifiable: audience === "CATALOGUE" },
    status: {
      ...status,
      resumeStartedAt: status.resumeStartedAt?.toISOString() ?? null,
      cooldownUntil: status.cooldownUntil?.toISOString() ?? null,
    },
  });
}
