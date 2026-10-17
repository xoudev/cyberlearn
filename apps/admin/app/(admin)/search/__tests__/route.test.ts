import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  searchUsers: vi.fn(),
  searchLessons: vi.fn(),
  searchTickets: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  userRepository: { searchForConsole: m.searchUsers },
  lessonRepository: { searchForConsole: m.searchLessons },
  ticketRepository: { searchForConsole: m.searchTickets },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: m.loggerError },
  errorMessage: (error: unknown) => String(error),
}));

const { GET } = await import("../route");
const { parseSearchResults } = await import("@/lib/command-palette");

/**
 * The quick search of the top bar, on the server: who may ask, what it
 * accepts, and what it answers.
 */

const ADMIN = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const LESSON = "33333333-3333-4333-8333-333333333333";
const TICKET = "44444444-4444-4444-8444-444444444444";

function request(query: string): Request {
  return new Request(`https://admin.cyberlearn.fr/search${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: ADMIN, email: "admin@x.fr", role: "ADMIN" });
  m.searchUsers.mockResolvedValue([]);
  m.searchLessons.mockResolvedValue([]);
  m.searchTickets.mockResolvedValue([]);
});

describe("GET /search", () => {
  it("checks the caller is an administrator before searching anything", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT:/access-denied"));
    await expect(GET(request("?q=amelie"))).rejects.toThrow("NEXT_REDIRECT:/access-denied");
    expect(m.searchUsers).not.toHaveBeenCalled();
    expect(m.searchLessons).not.toHaveBeenCalled();
    expect(m.searchTickets).not.toHaveBeenCalled();
  });

  it.each([
    ["no query", ""],
    ["one character", "?q=a"],
    ["a lone @ and a letter", "?q=%40a"],
    ["blanks", "?q=%20%20%20"],
    ["more than a hundred characters", `?q=${"x".repeat(101)}`],
  ])("refuses %s with a 400, and searches nothing", async (_name, query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error: "La recherche demande entre 2 et 100 caractères.",
    });
    expect(m.searchUsers).not.toHaveBeenCalled();
  });

  it("searches the three kinds with the trimmed term, without its @, five of each", async () => {
    await GET(request("?q=%20%40amelie%20"));
    expect(m.searchUsers).toHaveBeenCalledWith("amelie", 5);
    expect(m.searchLessons).toHaveBeenCalledWith("amelie", 5);
    expect(m.searchTickets).toHaveBeenCalledWith("amelie", 5);
  });

  it("answers each row with a label, a sublabel and the page that opens it", async () => {
    m.searchUsers.mockResolvedValue([
      {
        id: USER,
        email: "amelie@lycee.fr",
        username: "amelie",
        displayName: "Amélie",
        role: "TEACHER",
      },
      { id: ADMIN, email: "new@x.fr", username: null, displayName: "Nouvelle", role: "STUDENT" },
    ]);
    m.searchLessons.mockResolvedValue([
      {
        id: LESSON,
        refCode: "CL-LSN-01001-V01",
        title: "Le modèle OSI",
        status: "ARCHIVED",
        audience: "CATALOGUE",
      },
    ]);
    m.searchTickets.mockResolvedValue([
      {
        id: TICKET,
        subject: "Impossible de valider",
        status: "IN_PROGRESS",
        email: "amelie@lycee.fr",
        user: { username: "amelie", displayName: "Amélie" },
      },
    ]);

    const response = await GET(request("?q=ame"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body: unknown = await response.json();
    expect(body).toEqual({
      users: [
        {
          id: USER,
          label: "@amelie",
          sublabel: "amelie@lycee.fr · Professeur",
          href: `/users/${USER}`,
        },
        { id: ADMIN, label: "Nouvelle", sublabel: "new@x.fr · Étudiant", href: `/users/${ADMIN}` },
      ],
      lessons: [
        {
          id: LESSON,
          label: "Le modèle OSI",
          sublabel: "CL-LSN-01001-V01 · Archivé",
          href: `/lessons/${LESSON}/edit`,
        },
      ],
      tickets: [
        {
          id: TICKET,
          label: "Impossible de valider",
          sublabel: "En cours · @amelie",
          href: `/tickets/${TICKET}`,
        },
      ],
    });
    // The browser reads exactly this shape.
    expect(parseSearchResults(body)).toEqual(body);
  });

  it("names a guest's ticket by its address, and an anonymised one as such", async () => {
    m.searchTickets.mockResolvedValue([
      { id: TICKET, subject: "Question", status: "OPEN", email: "invite@x.fr", user: null },
      { id: USER, subject: "Ancien", status: "CLOSED", email: null, user: null },
    ]);
    const body = parseSearchResults(await (await GET(request("?q=qu"))).json());
    expect(body?.tickets.map((t) => t.sublabel)).toEqual([
      "Ouvert · invite@x.fr",
      "Fermé · anonyme",
    ]);
  });

  it("says the search failed, without the term or the error, and logs it", async () => {
    m.searchLessons.mockRejectedValue(new Error("connection reset"));
    const response = await GET(request("?q=amelie%40lycee.fr"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "La recherche a échoué. Réessaie." });
    expect(m.loggerError).toHaveBeenCalledOnce();
    expect(JSON.stringify(m.loggerError.mock.calls)).not.toContain("amelie");
  });
});
