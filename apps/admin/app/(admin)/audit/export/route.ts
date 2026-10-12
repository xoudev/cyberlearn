import { auditLogRepository, prisma } from "@cyberlearn/db";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import {
  AUDIT_CSV_HEADER,
  AUDIT_EXPORT_BATCH,
  AUDIT_EXPORT_MAX,
  auditCsvLine,
  auditExportFilename,
  CSV_BOM,
  csvLine,
} from "@/lib/audit-export";
import { rawParams } from "@/lib/grid-params";
import { auditFilterOf, parseAuditListParams } from "@/lib/list-params";

import { requireAdminAction } from "@/lib/auth";

/**
 * The audit log under the page's filter, as a CSV file.
 *
 * The same check as every console page, first: middleware lets a signed-in
 * session through, and this is what makes it an administrator's. The filter
 * is read from the URL by the page's own parser, so the file holds exactly
 * the entries the list shows.
 *
 * Streamed in batches, newest first, and capped: past AUDIT_EXPORT_MAX the
 * answer is a refusal that says so, never a file cut short without a word.
 * The export is itself written to the log, since the file carries addresses.
 */
export async function GET(request: Request): Promise<Response> {
  const admin = await requireAdminAction();

  const params = parseAuditListParams(rawParams(new URL(request.url).searchParams));
  const filter = auditFilterOf(params);
  const total = await auditLogRepository.count(filter);

  if (total > AUDIT_EXPORT_MAX) {
    return new Response(
      `L'export est limité à ${AUDIT_EXPORT_MAX.toLocaleString("fr-FR")} lignes, et ce filtre en compte ${total.toLocaleString("fr-FR")}. Resserre-le (une période plus courte, une action, un acteur) puis exporte à nouveau.`,
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "admin.audit.export",
        targetType: "AuditLog",
        metadata: {
          rows: total,
          ...(params.action !== undefined ? { action: params.action } : {}),
          ...(params.from !== undefined ? { from: params.from } : {}),
          ...(params.to !== undefined ? { to: params.to } : {}),
        },
      },
    });
  } catch (error) {
    // The export is not refused for it: the rows it holds are already in the log.
    logger.error({ scope: "admin", err: errorMessage(error) }, "audit export trace failed");
  }

  const encoder = new TextEncoder();
  let after: string | null = null;
  let written = 0;
  let started = false;

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!started) {
        started = true;
        controller.enqueue(encoder.encode(CSV_BOM + csvLine(AUDIT_CSV_HEADER)));
        return;
      }
      try {
        const size = Math.min(AUDIT_EXPORT_BATCH, AUDIT_EXPORT_MAX - written);
        const batch = size > 0 ? await auditLogRepository.exportBatch(filter, after, size) : [];
        if (batch.length === 0) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(batch.map(auditCsvLine).join("")));
        written += batch.length;
        after = batch[batch.length - 1]?.id ?? null;
        if (batch.length < size) controller.close();
      } catch (error) {
        logger.error({ scope: "admin", err: errorMessage(error) }, "audit export failed");
        controller.error(error);
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${auditExportFilename(new Date())}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
