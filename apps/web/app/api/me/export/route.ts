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

  // 3. Build export payload (all Prisma queries in parallel), then
  // 4. AuditLog - pseudonymize IP before storage (RGPD).
  //
  // Both stand or fall together. An export that fails to build has delivered
  // nothing, so the day's export is given back rather than charged: otherwise
  // "réessaie" would meet a 24-hour refusal. The audit row is part of the
  // export too - every download of somebody's data is recorded - so an insert
  // that fails is handled the same way, rather than as Next's bare 500 with
  // the day's export spent on a file that never left.
  const forwarded = request.headers.get("x-forwarded-for");
  const rawIp = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";
  let payload: Awaited<ReturnType<typeof buildExportPayload>>;
  try {
    payload = await buildExportPayload(user.id);
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "user.data.exported",
        targetType: "User",
        targetId: user.id,
        ipAddress: pseudonymize(rawIp),
      },
    });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "rgpd", err: errorMessage(err) }, "data export failed");
    await releaseDataExport(user.id);
    return new Response(JSON.stringify({ error: "export_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

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
