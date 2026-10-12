import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  listUsers: vi.fn(),
  existingIds: vi.fn<(ids: readonly string[]) => Promise<Set<string>>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  userRepository: { existingIds: m.existingIds },
  lastPage: (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize)),
}));
vi.mock("@cyberlearn/db/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ auth: { admin: { listUsers: m.listUsers } } }),
}));

const { AUTH_PAGE_SIZE, AUTH_SCAN_PAGES, listPendingSignUps } = await import(
  "../pending-signups.service"
);

/**
 * The sign-ups the console reads from Supabase Auth: those that never
 * confirmed their address and have no profile yet. Supabase is mocked; what
 * is checked is who makes the list, in which order, and how it is paged.
 */

interface AuthUser {
  id: string;
  email?: string;
  created_at: string;
  email_confirmed_at?: string | null;
  confirmation_sent_at?: string;
  is_anonymous?: boolean;
  app_metadata: { provider?: string };
}

function authUser(id: string, fields: Partial<AuthUser> = {}): AuthUser {
  return {
    id,
    email: `${id}@exemple.fr`,
    created_at: "2026-10-01T08:00:00Z",
    app_metadata: { provider: "email" },
    ...fields,
  };
}

function pageOf(users: AuthUser[]) {
  return {
    data: { users, aud: "authenticated", nextPage: null, lastPage: 1, total: users.length },
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.existingIds.mockResolvedValue(new Set());
});

describe("listPendingSignUps", () => {
  it("keeps the unconfirmed accounts that have no profile, newest first", async () => {
    m.listUsers.mockResolvedValue(
      pageOf([
        authUser("old", {
          created_at: "2026-09-01T08:00:00Z",
          confirmation_sent_at: "2026-09-01T08:00:01Z",
        }),
        authUser("confirmed", { email_confirmed_at: "2026-09-02T08:00:00Z" }),
        authUser("profiled"),
        authUser("anonymous", { is_anonymous: true }),
        authUser("phone", { email: "" }),
        authUser("new", { created_at: "2026-10-10T08:00:00Z", email_confirmed_at: null }),
      ]),
    );
    m.existingIds.mockResolvedValue(new Set(["profiled"]));

    const list = await listPendingSignUps({ q: "", page: 1, pageSize: 25 });

    expect(list.rows.map((row) => row.id)).toEqual(["new", "old"]);
    expect(list.rows[1]).toEqual({
      id: "old",
      email: "old@exemple.fr",
      createdAt: new Date("2026-09-01T08:00:00Z"),
      confirmationSentAt: new Date("2026-09-01T08:00:01Z"),
      provider: "email",
    });
    expect(list.rows[0]?.confirmationSentAt).toBeNull();
    expect(list).toMatchObject({ total: 2, page: 1, truncated: false });
    // Only the unconfirmed ones are looked up in users.
    expect(m.existingIds).toHaveBeenCalledWith(["old", "profiled", "new"]);
  });

  it("asks Supabase for its largest pages, and stops at the first short one", async () => {
    const full = Array.from({ length: AUTH_PAGE_SIZE }, (_, i) => authUser(`a${String(i)}`));
    m.listUsers.mockResolvedValueOnce(pageOf(full)).mockResolvedValueOnce(pageOf([authUser("b")]));

    const list = await listPendingSignUps({ q: "", page: 1, pageSize: 25 });

    expect(m.listUsers).toHaveBeenCalledTimes(2);
    expect(m.listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: AUTH_PAGE_SIZE });
    expect(m.listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: AUTH_PAGE_SIZE });
    expect(list.total).toBe(AUTH_PAGE_SIZE + 1);
    expect(list.truncated).toBe(false);
  });

  it("says when it stopped at its ceiling with accounts left unread", async () => {
    const full = Array.from({ length: AUTH_PAGE_SIZE }, (_, i) => authUser(`a${String(i)}`));
    m.listUsers.mockResolvedValue(pageOf(full));

    const list = await listPendingSignUps({ q: "", page: 1, pageSize: 25 });

    expect(m.listUsers).toHaveBeenCalledTimes(AUTH_SCAN_PAGES);
    expect(list.truncated).toBe(true);
  });

  it("searches the address, whatever its case", async () => {
    m.listUsers.mockResolvedValue(
      pageOf([
        authUser("x", { email: "Amelie@Lycee.fr" }),
        authUser("y", { email: "marc@lycee.fr" }),
      ]),
    );
    const list = await listPendingSignUps({ q: "AMEL", page: 1, pageSize: 25 });
    expect(list.rows.map((row) => row.id)).toEqual(["x"]);
    expect(list.total).toBe(1);
  });

  it("returns the page asked for, or the last one past the end", async () => {
    m.listUsers.mockResolvedValue(
      pageOf(
        Array.from({ length: 30 }, (_, i) =>
          authUser(`u${String(i).padStart(2, "0")}`, {
            created_at: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
          }),
        ),
      ),
    );

    const second = await listPendingSignUps({ q: "", page: 2, pageSize: 25 });
    expect(second.rows).toHaveLength(5);
    expect(second.rows[0]?.id).toBe("u04");

    const past = await listPendingSignUps({ q: "", page: 9, pageSize: 25 });
    expect(past.page).toBe(2);
  });

  it("names the sign-in method Supabase gives", async () => {
    m.listUsers.mockResolvedValue(
      pageOf([authUser("g", { app_metadata: { provider: "github" } })]),
    );
    const list = await listPendingSignUps({ q: "", page: 1, pageSize: 25 });
    expect(list.rows[0]?.provider).toBe("github");
  });

  it("throws when Supabase cannot be read, so the page can say so", async () => {
    m.listUsers.mockResolvedValue({ data: { users: [] }, error: new Error("unavailable") });
    await expect(listPendingSignUps({ q: "", page: 1, pageSize: 25 })).rejects.toThrow(
      "unavailable",
    );
    expect(m.existingIds).not.toHaveBeenCalled();
  });
});
