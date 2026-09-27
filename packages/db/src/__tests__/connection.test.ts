import { describe, expect, it } from "vitest";
import { pgPoolOptions } from "../connection";

const POOLER =
  "postgresql://postgres.ref:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

describe("pgPoolOptions", () => {
  it("keeps the pooler URL's single connection per instance", () => {
    const options = pgPoolOptions(POOLER);
    expect(options.max).toBe(1);
  });

  it("strips the parameters only Prisma understood", () => {
    const { connectionString } = pgPoolOptions(POOLER);
    expect(connectionString).toBe(
      "postgresql://postgres.ref:secret@aws-0-eu-west-3.pooler.supabase.com:6543/postgres",
    );
  });

  it("encrypts a remote connection without verifying the certificate, as Prisma 6 did", () => {
    expect(pgPoolOptions(POOLER).ssl).toEqual({ rejectUnauthorized: false });
  });

  it("verifies the certificate when the URL asks for verify-full", () => {
    expect(pgPoolOptions(`${POOLER}&sslmode=verify-full`).ssl).toEqual({
      rejectUnauthorized: true,
    });
  });

  it("leaves a local database in clear, as the CI stack serves it", () => {
    const options = pgPoolOptions("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
    expect(options.ssl).toBe(false);
    expect(options.max).toBeUndefined();
  });

  it("honours sslmode=disable on a remote host", () => {
    expect(pgPoolOptions("postgresql://u:p@db.example.com:5432/app?sslmode=disable").ssl).toBe(
      false,
    );
  });

  it("carries Prisma's five-second connect timeout, or the one the URL sets", () => {
    expect(pgPoolOptions(POOLER).connectionTimeoutMillis).toBe(5000);
    expect(pgPoolOptions(`${POOLER}&connect_timeout=12`).connectionTimeoutMillis).toBe(12000);
  });

  it("turns a non-default schema into a search_path", () => {
    const options = pgPoolOptions("postgresql://u:p@127.0.0.1:5432/app?schema=tenant");
    expect(options.options).toBe("-c search_path=tenant");
    expect(options.connectionString).not.toContain("schema");
  });
});
