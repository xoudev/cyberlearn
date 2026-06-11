import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// Matches base64url tokens of 32+ chars - covers JWT segments, deletion tokens, etc.
const TOKEN_REGEX = /\b[A-Za-z0-9_-]{32,}\b/g;

function scrubString(input: string): string {
  return input.replace(EMAIL_REGEX, "[EMAIL]").replace(TOKEN_REGEX, "[TOKEN]");
}

function scrubObject(obj: unknown): unknown {
  if (typeof obj === "string") return scrubString(obj);
  if (Array.isArray(obj)) return obj.map(scrubObject);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (/^(email|password|token|authorization|cookie|set-cookie)$/i.test(key)) {
        result[key] = "[REDACTED]";
        continue;
      }
      result[key] = scrubObject(value);
    }
    return result;
  }
  return obj;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // Redact PII query params from request URL
  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      ["token", "code", "email", "key"].forEach((k) => {
        if (url.searchParams.has(k)) {
          url.searchParams.set(k, "[REDACTED]");
        }
      });
      event.request.url = url.toString();
    } catch {
      // Invalid URL - leave as-is rather than drop the event
    }
  }

  if (event.request?.headers) {
    event.request.headers = scrubObject(event.request.headers) as typeof event.request.headers;
  }

  if (event.request?.cookies) {
    // SAFETY: Sentry v9 types cookies as Record<string,string> but we replace with a
    // sentinel string to prevent any cookie value from leaking. Cast through unknown.
    (event.request as Record<string, unknown>).cookies = "[REDACTED]";
  }

  if (event.message) {
    event.message = scrubString(event.message);
  }

  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value) {
        exception.value = scrubString(exception.value);
      }
    }
  }

  if (event.extra) {
    event.extra = scrubObject(event.extra) as typeof event.extra;
  }

  if (event.tags) {
    event.tags = scrubObject(event.tags) as typeof event.tags;
  }

  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    // Drop plain UUIDs (linkable to a person); preserve HMAC pseudonyms (64 hex chars).
    if (
      event.user.id &&
      typeof event.user.id === "string" &&
      /^[0-9a-f-]{36}$/i.test(event.user.id)
    ) {
      delete event.user.id;
    }
  }

  return event;
}

// Exported separately so it can be unit-tested without spinning up Sentry.
export function filterBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (
    breadcrumb.category === "navigation" ||
    breadcrumb.category === "fetch" ||
    breadcrumb.category === "xhr"
  ) {
    const url = (breadcrumb.data?.url ?? breadcrumb.data?.to ?? "") as unknown;
    // Drop breadcrumbs for sensitive RGPD endpoints to prevent PII appearing in replays.
    if (typeof url === "string" && /\/api\/me\/(delete|export)/.test(url)) {
      return null;
    }
  }
  return breadcrumb;
}
