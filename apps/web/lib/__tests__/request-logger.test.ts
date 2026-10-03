import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockHeaders } = vi.hoisted(() => ({ mockHeaders: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mockHeaders }));

import { logger } from "@cyberlearn/lib/logger";
import { requestLogger } from "../request-logger";

beforeEach(() => vi.clearAllMocks());

describe("requestLogger", () => {
  it("tags every line with the request's id", async () => {
    mockHeaders.mockResolvedValue(new Headers({ "x-request-id": "req-123" }));
    const log = await requestLogger();
    expect(log).not.toBe(logger);
    expect(log.bindings()).toEqual({ requestId: "req-123" });
  });

  it("falls back to the plain logger when the request has no id", async () => {
    mockHeaders.mockResolvedValue(new Headers());
    await expect(requestLogger()).resolves.toBe(logger);
  });

  it("falls back to the plain logger outside a request", async () => {
    mockHeaders.mockRejectedValue(new Error("headers was called outside a request scope"));
    await expect(requestLogger()).resolves.toBe(logger);
  });
});
