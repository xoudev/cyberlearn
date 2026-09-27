/**
 * Turns the DATABASE_URL Prisma 6 read into the pool options node-postgres
 * understands, with the same behaviour on the wire.
 *
 * Prisma 7 no longer ships its own engine: queries go through the `pg` driver
 * via @prisma/adapter-pg, and `pg` does not know Prisma's URL dialect. Handed
 * the URL as is, it would ignore `connection_limit` - ten connections per
 * serverless instance instead of one, against a pooler that counts them - and
 * it would read `sslmode` its own way, since pg parses the URL after the
 * options and lets it win. So the Prisma-only parameters come off the URL here
 * and are turned into their pg equivalent.
 *
 * TLS keeps what Prisma 6 did, which the upgrade guide spells out: encrypt, but
 * do not verify the certificate. Supabase serves a certificate signed by its
 * own CA, which is not in Node's trust store, so verifying would need that CA
 * shipped with the app. `sslmode=verify-full` in the URL opts into it;
 * `sslmode=disable` and a local host turn TLS off, as the CI stack needs.
 */

export interface PgPoolOptions {
  connectionString: string;
  max?: number;
  connectionTimeoutMillis: number;
  ssl: false | { rejectUnauthorized: boolean };
  options?: string;
}

// Prisma's own parameters, meaningless to pg. `connect_timeout`,
// `connection_limit`, `sslmode` and `schema` are translated below.
const PRISMA_ONLY = [
  "pgbouncer",
  "connection_limit",
  "pool_timeout",
  "connect_timeout",
  "socket_timeout",
  "statement_cache_size",
  "sslmode",
  "sslaccept",
  "schema",
];

// Prisma 6's default connect_timeout, in seconds. pg's own default is to wait forever.
const DEFAULT_CONNECT_TIMEOUT_S = 5;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function pgPoolOptions(databaseUrl: string): PgPoolOptions {
  const url = new URL(databaseUrl);
  const params = url.searchParams;

  const limit = Number(params.get("connection_limit"));
  const timeout = Number(params.get("connect_timeout") ?? DEFAULT_CONNECT_TIMEOUT_S);
  const sslmode = params.get("sslmode");
  const schema = params.get("schema");

  for (const key of PRISMA_ONLY) params.delete(key);

  const ssl =
    sslmode === "disable" || (sslmode === null && LOCAL_HOSTS.has(url.hostname))
      ? false
      : { rejectUnauthorized: sslmode === "verify-full" };

  return {
    connectionString: url.toString(),
    ...(Number.isInteger(limit) && limit > 0 && { max: limit }),
    // connect_timeout=0 meant "no limit" to Prisma, as 0 does to pg.
    connectionTimeoutMillis: Number.isFinite(timeout) && timeout >= 0 ? timeout * 1000 : 0,
    ssl,
    ...(schema && schema !== "public" && { options: `-c search_path=${schema}` }),
  };
}
