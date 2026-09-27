import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCron } from "@/lib/cron-auth";

function request(authorization?: string): Request {
  return new Request("https://cyberlearn.fr/api/cron/keep-alive", {
    headers: authorization === undefined ? {} : { authorization },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAuthorizedCron", () => {
  it("accepts the configured secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect(isAuthorizedCron(request("Bearer s3cret-value"))).toBe(true);
  });

  it("refuses a wrong, partial or missing secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect(isAuthorizedCron(request("Bearer s3cret-valuf"))).toBe(false);
    expect(isAuthorizedCron(request("Bearer s3cret"))).toBe(false);
    expect(isAuthorizedCron(request("s3cret-value"))).toBe(false);
    expect(isAuthorizedCron(request())).toBe(false);
  });

  it("stays closed when no secret is configured, even to an empty bearer", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron(request("Bearer "))).toBe(false);
    expect(isAuthorizedCron(request())).toBe(false);
  });
});
