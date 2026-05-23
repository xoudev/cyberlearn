import { prisma } from "@cyberlearn/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { checkDataExport } from "@/lib/rate-limit";
import { buildExportPayload } from "@/lib/rgpd/build-export";
import { pseudonymize } from "@/lib/pseudonymize";

export async function GET(request: Request): Promise<Response> {
  // 1. Auth — getUser() validates the JWT server-side
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

  // 2. Rate limit — 1 export per user per 24 hours
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

  // 3. Build export payload (all Prisma queries in parallel)
  const payload = await buildExportPayload(user.id);

  // 4. AuditLog — pseudonymize IP before storage (RGPD)
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
