import { describe, expect, it } from "vitest";
import { requestIdFor } from "../request-id";

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://cyberlearn.fr/", { headers });
}

describe("requestIdFor", () => {
  it("takes Vercel's id for the request", () => {
    const id = "cdg1::iad1::abcde-1712345678901-0123456789ab";
    expect(requestIdFor(request({ "x-vercel-id": id }))).toBe(id);
  });

  it.each(["", "short", "a b c d e f g h", "x".repeat(129), "cdg1::<script>"])(
    "makes its own when Vercel's is %j",
    (vercelId) => {
      const id = requestIdFor(request({ "x-vercel-id": vercelId }));
      expect(id).not.toBe(vercelId);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    },
  );

  it("makes its own without one, and never takes the client's x-request-id", () => {
    const id = requestIdFor(request({ "x-request-id": "chosen-by-the-client" }));
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
