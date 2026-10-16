import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The route that hands the holder their certificate PDF.
 *
 * A malformed id went straight to a query on a uuid column, which Postgres
 * rejects: the route answered 500 instead of 404. And the file name dropped
 * every accented letter of the path's title.
 */

const getUser = vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>();
const findFirst =
  vi.fn<(args: unknown) => Promise<{ pdfStorageKey: string; path: { title: string } } | null>>();
const createSignedUrl =
  vi.fn<
    (
      key: string,
      ttl: number,
      opts: { download: string },
    ) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
  >();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: () => Promise.resolve({ auth: { getUser: () => getUser() } }),
}));
vi.mock("@cyberlearn/db", () => ({
  prisma: { certificate: { findFirst: (a: unknown) => findFirst(a) } },
}));
vi.mock("@cyberlearn/db/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: (key: string, ttl: number, opts: { download: string }) =>
          createSignedUrl(key, ttl, opts),
      }),
    },
  }),
}));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ warn: vi.fn(), error: vi.fn() }),
}));

const { GET } = await import("../route");

const CERT_ID = "11111111-1111-4111-8111-111111111111";

function download(id: string): Promise<Response> {
  return GET(new Request(`https://cyberlearn.fr/api/certificates/${id}/download`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  getUser.mockReset();
  findFirst.mockReset();
  createSignedUrl.mockReset();
  getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
  findFirst.mockResolvedValue({ pdfStorageKey: "u1/c.pdf", path: { title: "Réseaux" } });
  createSignedUrl.mockResolvedValue({
    data: { signedUrl: "https://storage.example/signed" },
    error: null,
  });
});

describe("the certificate download", () => {
  it("answers a malformed id with a 404, without a query", async () => {
    const res = await download("pas-un-uuid");
    expect(res.status).toBe(404);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("names the file after the path, accents taken off rather than dropped", async () => {
    const res = await download(CERT_ID);
    expect(res.status).toBe(307);
    expect(createSignedUrl).toHaveBeenCalledWith("u1/c.pdf", 60, {
      download: "CyberLearn - Reseaux.pdf",
    });
  });

  it("still answers someone else's certificate with a 404", async () => {
    findFirst.mockResolvedValue(null);
    const res = await download(CERT_ID);
    expect(res.status).toBe(404);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CERT_ID, userId: "u1", revokedAt: null } }),
    );
  });
});
