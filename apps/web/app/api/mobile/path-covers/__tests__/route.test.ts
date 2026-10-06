import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PathCover } from "@/lib/paths/cover";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  visiblePathCovers: vi.fn<(userId: string) => Promise<PathCover[]>>(),
  logError: vi.fn(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/paths/cover", () => ({ visiblePathCovers: m.visiblePathCovers }));
vi.mock("@/lib/request-logger", () => ({
  requestLogger: () => Promise.resolve({ error: m.logError }),
}));

const { GET } = await import("../route");

const request = (): Request => new Request("https://cyberlearn.fr/api/mobile/path-covers");

const COVERS: PathCover[] = [
  { slug: "linux", image: null, illustration: "/covers/paths/linux.svg" },
  {
    slug: "osint",
    image: "https://x.supabase.co/storage/v1/object/sign/lesson-covers/a.webp?token=t",
    illustration: "/covers/paths/osint.svg",
  },
];

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("GET /api/mobile/path-covers", () => {
  it("refuses a caller the gate turns away, and signs nothing", async () => {
    m.userFromBearer.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(m.visiblePathCovers).not.toHaveBeenCalled();
  });

  it("gives the covers of the paths this reader may open", async () => {
    m.visiblePathCovers.mockResolvedValue(COVERS);
    const res = await GET(request());
    expect(await res.json()).toEqual({ ok: true, covers: COVERS });
    expect(m.visiblePathCovers).toHaveBeenCalledWith("user-1");
  });

  it("says it failed without the error's details", async () => {
    m.visiblePathCovers.mockRejectedValue(new Error("storage down at 10.0.0.3"));
    const res = await GET(request());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("10.0.0.3");
    expect(m.logError).toHaveBeenCalled();
  });
});
