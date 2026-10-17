import { describe, expect, it } from "vitest";
import {
  CERTIFICATES_PAGE,
  clip,
  reinstatedNotice,
  reinstatementQuestion,
  revocationQuestion,
  revokedNotice,
} from "../certificate-notice";

/**
 * What the holder reads when the console revokes a certificate or puts it
 * back, and what the console asks first. The notice names the path, so a
 * learner with several certificates knows which one without opening anything,
 * and it fits the notification's columns whatever was typed.
 */

describe("revokedNotice", () => {
  it("names the path in its title and gives the reason in its body", () => {
    const notice = revokedNotice("Réseau : les fondamentaux", "Examen passé par un tiers.");
    expect(notice.title).toBe("Certificat révoqué : Réseau : les fondamentaux");
    expect(notice.body).toBe(
      "Ton certificat du parcours « Réseau : les fondamentaux » n'est plus valide. Motif : Examen passé par un tiers.",
    );
    expect(notice.actionUrl).toBe(CERTIFICATES_PAGE);
  });

  it("fits the notification's columns, however long the path and the reason", () => {
    const notice = revokedNotice("P".repeat(400), "R".repeat(500));
    expect(notice.title.length).toBeLessThanOrEqual(200);
    expect(notice.body.length).toBeLessThanOrEqual(1000);
    expect(notice.title.endsWith("…")).toBe(true);
  });
});

describe("reinstatedNotice", () => {
  it("says the same certificate is valid again, for the path it names", () => {
    const notice = reinstatedNotice("Python");
    expect(notice.title).toBe("Certificat rétabli : Python");
    expect(notice.body).toContain("de nouveau valide");
    expect(notice.body).toContain("même numéro");
    expect(notice.actionUrl).toBe("/certificates");
  });
});

describe("the console's questions", () => {
  it("name the certificate, its holder and its path", () => {
    for (const ask of [revocationQuestion, reinstatementQuestion]) {
      const question = ask("CL-2026-1A2B3C4D", "Camille Martin", "Python");
      expect(question).toContain("CL-2026-1A2B3C4D");
      expect(question).toContain("Camille Martin");
      expect(question).toContain("« Python »");
    }
  });

  it("say what a revocation does to the public page and the PDF", () => {
    const question = revocationQuestion("CL-2026-1A2B3C4D", "Camille", "Python");
    expect(question).toMatch(/page de vérification/u);
    expect(question).toMatch(/PDF/u);
  });
});

describe("clip", () => {
  it("leaves a text that fits alone, and cuts one that does not to the exact width", () => {
    expect(clip("court", 10)).toBe("court");
    expect(clip("abcdefghijk", 10)).toBe("abcdefghi…");
    expect(clip("abcdefghijk", 10)).toHaveLength(10);
  });
});
