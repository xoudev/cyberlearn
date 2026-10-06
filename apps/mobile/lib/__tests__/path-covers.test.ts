import { describe, expect, it } from "vitest";
import { illustrationUri, readPathCovers } from "../path-covers";

const SIGNED = "https://x.supabase.co/storage/v1/object/sign/lesson-covers/a.webp?token=t";

describe("readPathCovers", () => {
  it("keys the covers by slug, image and illustration kept", () => {
    const covers = readPathCovers({
      ok: true,
      covers: [
        { slug: "linux", image: null, illustration: "/covers/paths/linux.svg" },
        { slug: "osint", image: SIGNED, illustration: "/covers/paths/osint.svg" },
      ],
    });
    expect(covers.get("linux")).toEqual({
      slug: "linux",
      image: null,
      illustration: "/covers/paths/linux.svg",
    });
    expect(covers.get("osint")?.image).toBe(SIGNED);
  });

  it("leaves out an entry it cannot use, and an image that is not https", () => {
    const covers = readPathCovers({
      ok: true,
      covers: [
        null,
        { slug: "", illustration: "/covers/paths/linux.svg" },
        { slug: "ailleurs", image: null, illustration: "https://evil.example/a.svg" },
        {
          slug: "http",
          image: "http://x.supabase.co/a.webp",
          illustration: "/covers/paths/grc.svg",
        },
      ],
    });
    expect([...covers.keys()]).toEqual(["http"]);
    expect(covers.get("http")?.image).toBeNull();
  });

  it("throws the server's words on a refusal", () => {
    expect(() => readPathCovers({ ok: false, error: "Non authentifié." })).toThrow(
      "Non authentifié.",
    );
    expect(() => readPathCovers("<html>")).toThrow("Chargement impossible");
  });
});

describe("illustrationUri", () => {
  it("puts the site path on the site the app talks to", () => {
    const cover = { slug: "linux", image: null, illustration: "/covers/paths/linux.svg" };
    expect(illustrationUri(cover, "https://cyberlearn.fr")).toBe(
      "https://cyberlearn.fr/covers/paths/linux.svg",
    );
    expect(illustrationUri(cover, "http://localhost:3000/")).toBe(
      "http://localhost:3000/covers/paths/linux.svg",
    );
  });
});
