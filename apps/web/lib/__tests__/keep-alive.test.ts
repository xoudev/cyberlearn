import { describe, expect, it } from "vitest";
import { keepAliveFailure } from "../keep-alive";

/**
 * A keep-alive run is recorded as failed when a configured service did not
 * answer, with the service named in the console's words.
 */

describe("keepAliveFailure", () => {
  it("is null when every configured service answered", () => {
    expect(keepAliveFailure({ postgres: "ok", redis: "ok" })).toBeNull();
    // Redis left unconfigured is not a failure.
    expect(keepAliveFailure({ postgres: "ok", redis: "unknown" })).toBeNull();
  });

  it("names the service that did not answer", () => {
    expect(keepAliveFailure({ postgres: "error", redis: "ok" })).toBe("Postgres ne répond pas");
    expect(keepAliveFailure({ postgres: "ok", redis: "error" })).toBe("Redis ne répond pas");
  });

  it("names both when neither answered", () => {
    expect(keepAliveFailure({ postgres: "error", redis: "error" })).toBe(
      "Postgres et Redis ne répondent pas",
    );
  });
});
