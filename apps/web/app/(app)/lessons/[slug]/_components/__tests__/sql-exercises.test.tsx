// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { WorkerLike } from "@/lib/sql/sandbox";
import { SqlInjectionLab } from "../sql-injection-lab";
import { SqlPlayground } from "../sql-playground";

/**
 * The two SQL exercises, against a worker that answers as the lesson's real
 * database does (the queries were played on sql.js itself before being
 * written here): the login form falls to an apostrophe in the vulnerable
 * version and holds in the fixed one; the playground checks its result.
 */

const USERS = [
  [1, "alice", "user"],
  [2, "bob", "user"],
  [3, "admin", "admin"],
];

function fakeDatabase(): () => WorkerLike {
  return () => {
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      terminate: () => undefined,
      postMessage: (message: unknown) => {
        // SAFETY: the sandbox posts nothing else; a test double reads it as such.
        const m = message as { id: number; action: string; sql?: string; params?: string[] };
        const sql = m.sql ?? "";
        let data: object = { results: [] };
        if (m.action === "exec" && sql.startsWith("SELECT id, username, role")) {
          const columns = ["id", "username", "role"];
          if (sql.includes("OR 1=1")) data = { results: [{ columns, values: USERS }] };
          else if (sql.includes("'admin' --"))
            data = { results: [{ columns, values: [USERS[2]] }] };
          else if (sql.includes("?")) data = { results: [] };
          else if (sql.includes("'alice' AND password = 'secret123'"))
            data = { results: [{ columns, values: [USERS[0]] }] };
        }
        if (m.action === "exec" && sql === "SELECT username FROM users") {
          data = { results: [{ columns: ["username"], values: USERS.map((u) => [u[1]]) }] };
        }
        if (m.action === "exec" && sql === "SELEC") data = { error: 'near "SELEC": syntax error' };
        queueMicrotask(() => worker.onmessage?.({ data: { id: m.id, ...data } }));
      },
    };
    return worker;
  };
}

const LAB = {
  id: "lab",
  title: "Le formulaire",
  schema: "CREATE TABLE users (id INTEGER, username TEXT, password TEXT, role TEXT);",
  query:
    "SELECT id, username, role FROM users WHERE username = '{login}' AND password = '{password}'",
  fields: [
    { name: "login", label: "Identifiant" },
    { name: "password", label: "Mot de passe", secret: true },
  ],
  goal: "Entre dans le compte admin.",
  success: { column: "role", equals: "admin" },
};

afterEach(cleanup);

async function login(loginValue: string, password: string): Promise<void> {
  fireEvent.change(screen.getByLabelText("Identifiant"), { target: { value: loginValue } });
  fireEvent.change(screen.getByLabelText("Mot de passe"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
  await screen.findByText("Requête reçue par la base :");
}

describe("SqlInjectionLab", () => {
  it("shows the query the base receives, the field pasted in", async () => {
    render(<SqlInjectionLab {...LAB} createWorker={fakeDatabase()} />);
    await login("alice' OR 1=1 --", "x");
    expect(
      screen.getByText(
        "SELECT id, username, role FROM users WHERE username = 'alice' OR 1=1 --' AND password = 'x'",
        { exact: false },
      ),
    ).toBeTruthy();
    expect(
      await screen.findByText(
        "Connecté en tant que alice, mais ce n'est pas encore le compte visé.",
      ),
    ).toBeTruthy();
  });

  it("says the injection worked when it reaches the account aimed at", async () => {
    render(<SqlInjectionLab {...LAB} createWorker={fakeDatabase()} />);
    await login("admin' --", "x");
    expect(
      await screen.findByText("✓ Connecté en tant que admin : l'injection a marché."),
    ).toBeTruthy();
  });

  it("holds in the fixed version: the same input is just a strange name", async () => {
    render(<SqlInjectionLab {...LAB} createWorker={fakeDatabase()} />);
    fireEvent.click(screen.getByRole("radio", { name: "Code corrigé" }));
    await login("admin' --", "x");
    expect(screen.getByText(/-- paramètres : \["admin' --","x"\]/)).toBeTruthy();
    expect((await screen.findByText(/Identifiants refusés/)).textContent).toContain(
      "une apostrophe n'y est qu'un caractère de plus",
    );
  });

  it("says what is wrong with a lab rather than breaking the lesson", () => {
    render(<SqlInjectionLab {...LAB} query="SELECT 1" />);
    expect(screen.getByRole("note").textContent).toContain("la requête n'a pas de {login}");
  });
});

describe("SqlPlayground", () => {
  const PLAYGROUND = {
    id: "pg",
    schema: "CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL);",
    task: "Liste les noms.",
    expected: { rows: [["admin"], ["alice"], ["bob"]] },
    hint: "SELECT username FROM users",
  };

  it("lists the tables before SQLite has even started", () => {
    render(<SqlPlayground {...PLAYGROUND} createWorker={fakeDatabase()} />);
    expect(screen.getByText("users(id, username)")).toBeTruthy();
  });

  it("runs the query, draws the result and checks it against the expected rows", async () => {
    render(<SqlPlayground {...PLAYGROUND} createWorker={fakeDatabase()} />);
    fireEvent.change(screen.getByLabelText("Ta requête SQL"), {
      target: { value: "SELECT username FROM users" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Exécuter" }));
    expect(await screen.findByText("✓ C'est la bonne réponse.")).toBeTruthy();
    expect(screen.getByText("3 lignes")).toBeTruthy();
  });

  it("passes SQLite's error on, and gives the hint after two misses", async () => {
    render(<SqlPlayground {...PLAYGROUND} createWorker={fakeDatabase()} />);
    fireEvent.change(screen.getByLabelText("Ta requête SQL"), { target: { value: "SELEC" } });
    fireEvent.click(screen.getByRole("button", { name: "Exécuter" }));
    expect(await screen.findByText('Erreur SQLite : near "SELEC": syntax error')).toBeTruthy();
    expect(screen.queryByText(/Indice/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Exécuter" }));
    expect(await screen.findByText("Indice : SELECT username FROM users")).toBeTruthy();
  });
});
