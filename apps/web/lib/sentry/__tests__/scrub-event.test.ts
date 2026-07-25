import { describe, expect, it } from "vitest";
import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";
import { filterBreadcrumb, scrubEvent } from "../scrub-event";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<ErrorEvent> = {}): ErrorEvent {
  const event: ErrorEvent = { type: undefined, ...overrides };
  return event;
}

// ── scrubEvent ────────────────────────────────────────────────────────────────

describe("scrubEvent - URL scrubbing", () => {
  it("redacts ?token= query parameter from request.url", () => {
    const event = makeEvent({
      request: {
        url: "https://cyberlearn.fr/api/me/delete/confirm?token=abc123def456ghi789jkl012mno345p",
      },
    });
    const result = scrubEvent(event);
    const url = new URL(result.request!.url!);
    expect(url.searchParams.get("token")).toBe("[REDACTED]");
  });

  it("redacts ?code= and ?email= query parameters", () => {
    const event = makeEvent({
      request: {
        url: "https://cyberlearn.fr/auth/callback?code=shortcode&email=user@example.com",
      },
    });
    const result = scrubEvent(event);
    const url = new URL(result.request!.url!);
    expect(url.searchParams.get("code")).toBe("[REDACTED]");
    expect(url.searchParams.get("email")).toBe("[REDACTED]");
  });

  it("redacts ?token_hash=, the live credential in the recovery link", () => {
    // /auth/confirm?token_hash=...&type=recovery is what a password-reset
    // email carries. The old name list was exact-match, so this one went
    // through untouched.
    const event = makeEvent({
      request: {
        url: "https://cyberlearn.fr/auth/confirm?token_hash=pkce_9f2c4b1a8d3e7f06&type=recovery",
      },
    });
    const result = scrubEvent(event);
    const url = new URL(result.request!.url!);
    expect(url.searchParams.get("token_hash")).toBe("[REDACTED]");
    expect(result.request?.url).not.toContain("pkce_9f2c4b1a8d3e7f06");
    // Non-sensitive params survive, so the URL stays useful for debugging.
    expect(url.searchParams.get("type")).toBe("recovery");
  });

  it("redacts a token carried in the path, not just the query string", () => {
    const event = makeEvent({
      request: {
        url: "https://cyberlearn.fr/api/me/delete/confirm/abc123def456ghi789jkl012mno345pq",
      },
    });
    const result = scrubEvent(event);
    expect(result.request?.url).not.toContain("abc123def456ghi789jkl012mno345pq");
    expect(result.request?.url).toContain("[TOKEN]");
  });

  it("still scrubs a malformed URL instead of passing it through", () => {
    const event = makeEvent({
      request: { url: "not a url ?token_hash=abc123def456ghi789jkl012mno345pq" },
    });
    const result = scrubEvent(event);
    expect(result.request?.url).not.toContain("abc123def456ghi789jkl012mno345pq");
  });
});

describe("scrubEvent - header scrubbing", () => {
  it("redacts Authorization header value", () => {
    const event = makeEvent({
      request: {
        headers: { authorization: "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig" },
      },
    });
    const result = scrubEvent(event);
    expect((result.request!.headers as Record<string, string>).authorization).toBe("[REDACTED]");
  });

  it("redacts cookie header value", () => {
    const event = makeEvent({
      request: { headers: { cookie: "sb-session=xyz; other=abc" } },
    });
    const result = scrubEvent(event);
    expect((result.request!.headers as Record<string, string>).cookie).toBe("[REDACTED]");
  });
});

describe("scrubEvent - exception scrubbing", () => {
  it("replaces email address in exception.value with [EMAIL]", () => {
    const event = makeEvent({
      exception: {
        values: [{ type: "Error", value: "Failed to send email to alice@example.com" }],
      },
    });
    const result = scrubEvent(event);
    expect(result.exception!.values![0]!.value).toBe("Failed to send email to [EMAIL]");
  });
});

describe("scrubEvent - extra scrubbing", () => {
  it("redacts email key in event.extra", () => {
    const event = makeEvent({ extra: { email: "alice@example.com", reason: "export" } });
    const result = scrubEvent(event);
    expect((result.extra as Record<string, unknown>).email).toBe("[REDACTED]");
    expect((result.extra as Record<string, unknown>).reason).toBe("export");
  });
});

describe("scrubEvent - user scrubbing", () => {
  it("deletes user.email if present", () => {
    const event = makeEvent({ user: { email: "alice@example.com", id: "some-id" } });
    const result = scrubEvent(event);
    expect(result.user!.email).toBeUndefined();
  });

  it("deletes user.id if it is a UUID (36-char hex+dash format)", () => {
    const event = makeEvent({ user: { id: "550e8400-e29b-41d4-a716-446655440000" } });
    const result = scrubEvent(event);
    expect(result.user!.id).toBeUndefined();
  });

  it("preserves user.id when it is a 64-char HMAC pseudonym (not a UUID)", () => {
    const hmacId = "a".repeat(64); // 64 hex chars - HMAC output
    const event = makeEvent({ user: { id: hmacId } });
    const result = scrubEvent(event);
    expect(result.user!.id).toBe(hmacId);
  });

  it("deletes user.ip_address if present", () => {
    const event = makeEvent({ user: { ip_address: "1.2.3.4" } });
    const result = scrubEvent(event);
    expect(result.user!.ip_address).toBeUndefined();
  });
});

// ── filterBreadcrumb ──────────────────────────────────────────────────────────

describe("filterBreadcrumb - sensitive route filtering", () => {
  it("drops navigation breadcrumb to /api/me/delete/confirm", () => {
    const bc: Breadcrumb = {
      category: "navigation",
      data: { to: "/api/me/delete/confirm" },
    };
    expect(filterBreadcrumb(bc)).toBeNull();
  });

  it("drops fetch breadcrumb to /api/me/export", () => {
    const bc: Breadcrumb = {
      category: "fetch",
      data: { url: "/api/me/export" },
    };
    expect(filterBreadcrumb(bc)).toBeNull();
  });

  it("drops xhr breadcrumb to /api/me/delete", () => {
    const bc: Breadcrumb = {
      category: "xhr",
      data: { url: "/api/me/delete/request" },
    };
    expect(filterBreadcrumb(bc)).toBeNull();
  });

  it("passes through breadcrumbs to non-sensitive routes", () => {
    const bc: Breadcrumb = {
      category: "navigation",
      data: { to: "/dashboard" },
    };
    expect(filterBreadcrumb(bc)).toBe(bc);
  });

  it("passes through non-navigation/fetch/xhr breadcrumbs regardless of URL", () => {
    const bc: Breadcrumb = {
      category: "ui.click",
      data: { url: "/api/me/delete/request" },
    };
    expect(filterBreadcrumb(bc)).toBe(bc);
  });
});
