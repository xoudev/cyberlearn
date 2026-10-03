import { describe, expect, it } from "vitest";
import {
  parameterise,
  parseSqlInjectionLab,
  parseSqlPlayground,
  pasteFields,
} from "../sql-exercise.schema.js";

const SCHEMA = "CREATE TABLE users (id INTEGER, username TEXT, password TEXT);";
const QUERY = "SELECT id FROM users WHERE username = '{login}' AND password = '{password}'";
const FIELDS = [
  { name: "login", label: "Identifiant" },
  { name: "password", label: "Mot de passe", secret: true },
];

describe("parseSqlPlayground", () => {
  it("accepts a playground, with or without an expected result", () => {
    expect(parseSqlPlayground({ id: "p", schema: SCHEMA }).ok).toBe(true);
    const parsed = parseSqlPlayground({
      id: "p",
      schema: SCHEMA,
      expected: { rows: [[1, "alice", null]] },
    });
    expect(parsed.ok && parsed.value.expected?.ordered).toBe(false);
  });

  it("refuses a playground without a schema, or with rows that are not rows", () => {
    expect(parseSqlPlayground({ id: "p" }).ok).toBe(false);
    expect(parseSqlPlayground({ id: "p", schema: SCHEMA, expected: { rows: [1, 2] } }).ok).toBe(
      false,
    );
  });
});

describe("parseSqlInjectionLab", () => {
  it("accepts a lab whose every field has its place in the query", () => {
    expect(
      parseSqlInjectionLab({
        id: "l",
        schema: SCHEMA,
        query: QUERY,
        fields: FIELDS,
        goal: "Entre.",
      }).ok,
    ).toBe(true);
  });

  it("refuses a field the query does not use, and says which", () => {
    expect(
      parseSqlInjectionLab({
        id: "l",
        schema: SCHEMA,
        query: "SELECT id FROM users WHERE username = '{login}'",
        fields: FIELDS,
        goal: "Entre.",
      }),
    ).toEqual({
      ok: false,
      problem: "la requête n'a pas de {password} : le champ Mot de passe n'irait nulle part.",
    });
  });

  it("refuses a field name that would not be a placeholder", () => {
    expect(
      parseSqlInjectionLab({
        id: "l",
        schema: SCHEMA,
        query: "SELECT 1 WHERE '{Login}'",
        fields: [{ name: "Login", label: "x" }],
        goal: "Entre.",
      }).ok,
    ).toBe(false);
  });
});

describe("pasteFields", () => {
  it("pastes the values as the vulnerable server does, apostrophes and all", () => {
    expect(pasteFields(QUERY, { login: "alice' OR 1=1 --", password: "x" })).toBe(
      "SELECT id FROM users WHERE username = 'alice' OR 1=1 --' AND password = 'x'",
    );
  });
});

describe("parameterise", () => {
  it("puts a ? where each field was, quotes included, and the values apart", () => {
    expect(parameterise(QUERY, { login: "alice' OR 1=1 --", password: "x" })).toEqual({
      sql: "SELECT id FROM users WHERE username = ? AND password = ?",
      params: ["alice' OR 1=1 --", "x"],
    });
  });

  it("handles a placeholder without quotes, and an empty field", () => {
    expect(parameterise("SELECT * FROM t WHERE id = {id}", {})).toEqual({
      sql: "SELECT * FROM t WHERE id = ?",
      params: [""],
    });
  });
});
