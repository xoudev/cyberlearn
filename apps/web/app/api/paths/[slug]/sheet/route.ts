import { z } from "zod";
import { sheetFileName } from "@cyberlearn/lib/paths/sheet";
import { loadSheet } from "@/lib/sheets/load";
import { renderSheetPdf } from "@/lib/sheets/render";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/paths/[slug]/sheet?module=N: the revision sheet of module N as a
 * PDF, for the signed-in reader, generated on request (a few kilobytes of
 * text, nothing kept). Not found rather than forbidden when the reader may
 * not open the path, like the lesson page: a slug is not a right.
 */

const query = z.object({ module: z.coerce.number().int().min(1).max(99) });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 404 });

  const parsed = query.safeParse({ module: new URL(request.url).searchParams.get("module") });
  if (!parsed.success) return new Response(null, { status: 404 });

  const sheet = await loadSheet(slug, user.id, parsed.data.module);
  if (!sheet) return new Response(null, { status: 404 });

  const pdf = await renderSheetPdf(sheet);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${sheetFileName(slug, parsed.data.module)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
