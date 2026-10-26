import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  count: vi.fn(),
  exportBatch: vi.fn(),
  record: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  auditLogRepository: { count: m.count, exportBatch: m.exportBatch, record: m.record },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.loggerError },
  errorMessage: (error: unknown) => String(error),
}));

const { GET } = await import("../route");
const { AUDIT_EXPORT_MAX, AUDIT_EXPORT_BATCH } = await import("@/lib/audit-export");

/**
 * The audit log's CSV export: who may download it, what it holds, and what
 * it says when the filter matches more than it writes.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const CRLF = "\r\n";

function entry(id: string, fields: Record<string, unknown> = {}) {
  return {
    id,
    action: "lesson.create",
    actorId: ADMIN,
    anonymized: false,
    targetType: "Lesson",
    targetId: "2b3c4d5e-1111-4111-8111-111111111111",
    metadata: { title: "Les réseaux" },
    createdAt: new Date("2026-10-12T08:30:00Z"),
    actor: { username: "jordan", displayName: "Jordan", email: "jordan@exemple.fr" },
    ...fields,
  };
}

function request(query = ""): Request {
  return new Request(`https://admin.cyberlearn.fr/audit/export${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN, email: "admin@x.fr", role: "ADMIN" });
  m.count.mockResolvedValue(2);
  m.exportBatch.mockResolvedValue([]);
  m.record.mockResolvedValue(undefined);
});

describe("GET /audit/export", () => {
  it("checks the caller is an administrator before reading anything", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_HTTP_ERROR_FALLBACK;404"));
    await expect(GET(request())).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(m.count).not.toHaveBeenCalled();
    expect(m.exportBatch).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("sends the redirect of a caller without a session on, untouched", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(GET(request())).rejects.toThrow("NEXT_REDIRECT");
    expect(m.count).not.toHaveBeenCalled();
  });

  it("streams the filtered entries as a CSV attachment, header first", async () => {
    m.exportBatch.mockResolvedValueOnce([
      entry("e1"),
      entry("e2", { actor: null, actorId: null, anonymized: true, metadata: null, targetId: null }),
    ]);

    const response = await GET(request("?action=lesson.create&from=2026-10-01"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="audit-log-\d{4}-\d{2}-\d{2}\.csv"$/u,
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");

    // A byte-order mark first, which a spreadsheet reads as "this is UTF-8".
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = new TextDecoder().decode(bytes).split(CRLF);
    expect(lines[0]).toBe(
      '"Horodatage (UTC)";"Action";"Acteur";"Identifiant de l\'acteur";"Type de cible";"Identifiant de la cible";"Métadonnées"',
    );
    expect(lines[1]).toBe(
      `"2026-10-12T08:30:00.000Z";"lesson.create";"jordan";"${ADMIN}";"Lesson";"2b3c4d5e-1111-4111-8111-111111111111";"{""title"":""Les réseaux""}"`,
    );
    expect(lines[2]).toBe(
      '"2026-10-12T08:30:00.000Z";"lesson.create";"compte supprimé";"";"Lesson";"";""',
    );
    expect(lines).toHaveLength(4);

    // The page's filter, read by the page's parser.
    expect(m.count).toHaveBeenCalledWith(
      expect.objectContaining({ action: "lesson.create", from: new Date("2026-09-30T22:00:00Z") }),
    );
  });

  it("goes on from the last entry of each full batch", async () => {
    const full = Array.from({ length: AUDIT_EXPORT_BATCH }, (_, i) => entry(`a${String(i)}`));
    m.count.mockResolvedValue(AUDIT_EXPORT_BATCH + 1);
    m.exportBatch.mockResolvedValueOnce(full).mockResolvedValueOnce([entry("last")]);

    const text = await (await GET(request())).text();

    expect(m.exportBatch).toHaveBeenNthCalledWith(1, expect.anything(), null, AUDIT_EXPORT_BATCH);
    expect(m.exportBatch).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      `a${String(AUDIT_EXPORT_BATCH - 1)}`,
      AUDIT_EXPORT_BATCH,
    );
    expect(text.trimEnd().split("\r\n")).toHaveLength(AUDIT_EXPORT_BATCH + 2);
  });

  it("refuses a filter past the cap, says why, and reads none of it", async () => {
    m.count.mockResolvedValue(AUDIT_EXPORT_MAX + 1);
    const response = await GET(request());
    expect(response.status).toBe(413);
    expect(await response.text()).toMatch(/limité à 50[\s\u202f]000 lignes/u);
    expect(m.exportBatch).not.toHaveBeenCalled();
    expect(m.record).not.toHaveBeenCalled();
  });

  it("writes the export itself to the log, without the people it searched for", async () => {
    await GET(request("?actor=amelie%40lycee.fr&action=lesson.create&to=2026-10-07"));
    expect(m.record).toHaveBeenCalledWith({
      actorId: ADMIN,
      action: "admin.audit.export",
      targetType: "AuditLog",
      targetId: null,
      metadata: { rows: 2, action: "lesson.create", to: "2026-10-07" },
    });
  });

  it("still exports when that trace cannot be written", async () => {
    m.record.mockRejectedValue(new Error("audit_logs unavailable"));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(m.loggerError).toHaveBeenCalled();
  });
});
