import { afterEach, describe, expect, it, vi } from "vitest";
import ProfilePreviewImage from "../opengraph-image";

const findPreviewCard = vi.hoisted(() => vi.fn());
vi.mock("@cyberlearn/db", () => ({ userRepository: { findPreviewCard } }));
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("profile share images", () => {
  it.each([false, true])(
    "renders the public=%s card with local glyphs only",
    async (publicProfile) => {
      findPreviewCard.mockResolvedValue(
        publicProfile
          ? {
              displayName: "Camille Дмитрий",
              username: "profil-test",
              xpTotal: 1200,
              badges: 3,
              streakDays: 5,
            }
          : null,
      );
      // Satori may fetch its embedded data-URI WASM; no text may leave for a remote font.
      const fetch = vi.fn().mockRejectedValue(new Error("Remote assets are disabled"));
      vi.stubGlobal("fetch", fetch);
      const response = await ProfilePreviewImage({
        params: Promise.resolve({ username: "profil-test" }),
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Array.from(bytes.subarray(0, 4))).toEqual([137, 80, 78, 71]);
      const remoteCalls = fetch.mock.calls.filter(([url]) => String(url).startsWith("http"));
      expect(remoteCalls.length).toBe(0);
      expect(findPreviewCard).toHaveBeenCalledWith("profil-test");
    },
  );
});
