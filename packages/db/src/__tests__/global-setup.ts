// Runs once before the test workers start. It answers one question for
// setup.ts: is the local Supabase stack a developer's .env names running?
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { resolve } from "node:path";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    /** The .env names a local database, and nothing answers at its address. */
    localStackDown: boolean;
  }
}

/** Whether something accepts connections at the database's address. */
function answers(url: string): Promise<boolean> {
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return Promise.resolve(false);
  }
  return new Promise((done) => {
    const socket = connect({ host: target.hostname, port: Number(target.port || 5432) });
    const finish = (up: boolean): void => {
      socket.destroy();
      done(up);
    };
    socket.setTimeout(1_000, () => {
      finish(false);
    });
    socket.once("connect", () => {
      finish(true);
    });
    socket.once("error", () => {
      finish(false);
    });
  });
}

export default async function setup(project: TestProject): Promise<void> {
  const envPath = resolve(process.cwd(), ".env");
  if (existsSync(envPath)) process.loadEnvFile(envPath);

  const url = process.env["DATABASE_URL"] ?? "";
  const isLocal = /@(127\.0\.0\.1|localhost)(:\d+)?\//u.test(url);
  // Never in CI: there the stack is part of the run, and one that did not
  // start has to fail it rather than turn every integration spec into a pass.
  const down = isLocal && process.env["CI"] !== "true" && !(await answers(url));
  if (down) {
    process.stderr.write(
      "\n[db tests] The local Supabase stack does not answer: integration specs are skipped. Run `supabase start` to include them.\n\n",
    );
  }
  project.provide("localStackDown", down);
}
