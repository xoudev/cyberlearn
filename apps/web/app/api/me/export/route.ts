import { prisma } from "@cyberlearn/db";
import { errorMessage } from "@cyberlearn/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkDataExport, releaseDataExport } from "@/lib/rate-limit";
import { buildExportPayload } from "@/lib/rgpd/build-export";
import { pseudonymize } from "@/lib/pseudonymize";
import { requestLogger } from "@/lib/request-logger";

/**
 * The account holder's data, as a JSON download (RGPD art. 20).
 *
 * It does not look at bans: portability is a right a banned account keeps, and
 * /banned offers this download for that reason.
 */
export async function GET(request: Request): Promise<Response> {
  // 1. Auth - getUser() validates the JWT server-side
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Rate limit - 1 export per user per 24 hours
  const rl = await checkDataExport(user.id);
  if (!rl.success) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rl.retryAfterSeconds),
      },
    });
  }

  // 3. Build export payload (all Prisma queries in parallel). An export that
  // fails to build has delivered nothing, so the day's export is given back
  // rather than charged: otherwise "réessaie" would meet a 24-hour refusal.
  let payload: Awaited<ReturnType<typeof buildExportPayload>>;
  try {
    payload = await buildExportPayload(user.id);
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "rgpd", err: errorMessage(err) }, "data export failed to build");
    await releaseDataExport(user.id);
    return new Response(JSON.stringify({ error: "export_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // 4. AuditLog - pseudonymize IP before storage (RGPD)
  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.data.exported",
      targetType: "User",
      targetId: user.id,
      ipAddress: pseudonymize(rawIp),
    },
  });

  // 5. Stream JSON response as file download
  const filename = `cyberlearn-export-${String(Date.now())}.json`;
  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
