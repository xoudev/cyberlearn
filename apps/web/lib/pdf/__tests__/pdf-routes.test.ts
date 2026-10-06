import { globSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PDF_ROUTES, PDFKIT_STANDARD_FONTS } from "../pdf-routes";

/**
 * pdfkit's standard fonts are added by hand to the functions that render a
 * PDF (next.config.ts): the glob must still find them after an upgrade, or
 * the sheet and the certificates answer 500 again in production.
 */

const APP_ROOT = path.resolve(__dirname, "../../..");

describe("pdfkit's standard fonts", () => {
  it("are found where next.config.ts looks for them", () => {
    const found = globSync(PDFKIT_STANDARD_FONTS.replace("{cjs,mjs}", "cjs"), { cwd: APP_ROOT });
    const names = found.map((file) => path.basename(file));
    expect(names).toContain("Helvetica.cjs");
    expect(names).toContain("HelveticaBold.cjs");
    expect(names).toContain("HelveticaOblique.cjs");
  });

  it("go to the sheet's route, and to the routes that issue a certificate", () => {
    expect(PDF_ROUTES).toContain("/api/paths/*/sheet");
    expect(PDF_ROUTES).toContain("/lessons/*");
    expect(PDF_ROUTES).toContain("/api/mobile/**");
  });
});
