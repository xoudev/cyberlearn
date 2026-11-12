import { z } from "zod";
import { banRepository, classRepository } from "@cyberlearn/db";
import { gradebookFilename, gradebookRows } from "@cyberlearn/lib/class/gradebook";
import { csvFile } from "@cyberlearn/lib/files/csv";
import { needsMfaStep } from "@/lib/auth/password-flow";
import { checkClassExport } from "@/lib/rate-limit";
import { requestLogger } from "@/lib/request-logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/classes/[id]/export: a class's progress as a CSV file, for the
 * teacher who follows it (or an administrator). One line per student, the
 * figures of the class page, then each piece of work set with the day it was
 * finished and its quiz score.
 *
 * /api is outside the middleware's gate, so everything is checked here: a
 * session the auth server knows, that has gone through its second factor, on
 * an account that is not banned. Then the class itself answers whether this
 * account may read it (classRepository.findGradebook). Not found rather than
 * forbidden in every case: an id is not a right, and a refusal that said
 * "forbidden" would confirm the class exists.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const parsed = z.guid().safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404 });
  const classId = parsed.data;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 404 });
  if (needsMfaStep(await supabase.auth.mfa.getAuthenticatorAssuranceLevel())) {
    return new Response(null, { status: 404 });
  }
  if (await banRepository.findActive(user.id)) return new Response(null, { status: 404 });

  const limit = await checkClassExport(user.id);
  if (!limit.success) {
    return new Response(null, {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const gradebook = await classRepository.findGradebook(classId, user.id);
  if (!gradebook) return new Response(null, { status: 404 });

  // Who took a class's progress out of the site, and when: the file holds
  // other people's names and scores. The line itself holds neither.
  const log = await requestLogger();
  log.info(
    { scope: "classes/export", classId, actorId: user.id, students: gradebook.students.length },
    "class progress exported",
  );

  const filename = gradebookFilename(gradebook.name, new Date());
  return new Response(csvFile(gradebookRows(gradebook)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
