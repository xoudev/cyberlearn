import { z } from "zod";
import { auditLogRepository, buildExportPayload, type ExportPayload } from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { learnerSiteUrl } from "@/lib/learner-url";
import { checkUserExportRateLimit } from "@/lib/rate-limit";
import { userExportFilename } from "@/lib/user-record";

import { requireAdminAction } from "@/lib/auth";

/** The account's id, as the page's URL carries it (route-id.ts says why guid). */
const exportParams = z.object({ id: z.guid() });

function refusal(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

/**
 * An account's GDPR export, as the JSON file its holder downloads from the
 * site (RGPD art. 15 and 20): the same builder, the same file. It answers a
 * request made to the team rather than from the account, by a letter, a mail
 * to privacy@ or somebody who can no longer sign in.
 *
 * The administrator's check first, as in every console route: middleware
 * knows a session, not a role. Then a cap per administrator, as the learner's
 * own export has one. The file is written to the audit log before it leaves,
 * and does not leave when the entry cannot be written: every copy of
 * somebody's data that goes out of the console is on record.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const admin = await requireAdminAction();

  const parsed = exportParams.safeParse(await params);
  if (!parsed.success) return refusal(404, "Ce compte n'existe pas.");
  const userId = parsed.data.id;

  if (!(await checkUserExportRateLimit(admin.id))) {
    return refusal(
      429,
      "Trop d'exports en une heure depuis ce compte administrateur. Réessaie un peu plus tard.",
      { "Retry-After": "3600" },
    );
  }

  let payload: ExportPayload;
  try {
    payload = await buildExportPayload(userId, { siteUrl: learnerSiteUrl() });
    // Nothing to hand over, and nothing to record: the account is not there,
    // or no longer is.
    if (payload.profile === null) return refusal(404, "Ce compte n'existe pas ou a été supprimé.");

    await auditLogRepository.record({
      actorId: admin.id,
      action: AUDIT_ACTION.user.dataExported,
      targetType: "User",
      targetId: userId,
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "user data export failed");
    return refusal(500, "L'export n'a pas pu être préparé. Réessaie dans un instant.");
  }

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${userExportFilename(userId, new Date())}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
