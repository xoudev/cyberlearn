import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/settings/preferences",
}));

import { SettingsDrawer } from "../SettingsDrawer";
import { SETTINGS_SECTIONS, settingsHref, settingsSection } from "../sections";

describe("the settings sections", () => {
  it("are the seven of the page, data last and marked", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.key)).toEqual([
      "profile",
      "privacy",
      "preferences",
      "notifications",
      "moderation",
      "account",
      "data",
    ]);
    expect(settingsSection("data")?.danger).toBe(true);
    expect(settingsSection("billing")).toBeUndefined();
    expect(settingsHref("account")).toBe("/settings/account");
  });
});

describe("the settings drawer", () => {
  const html = renderToStaticMarkup(
    React.createElement(SettingsDrawer, {
      section: "preferences",
      username: "jordan",
      children: React.createElement("p", null, "le contenu de la section"),
    }),
  );

  it("is a dialog named Paramètres, for the reader it belongs to", () => {
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Paramètres");
    expect(html).toContain("@jordan");
    expect(html).toContain("le contenu de la section");
  });

  it("lists every section, the current one marked, and leaves for the full page by a plain link", () => {
    for (const section of SETTINGS_SECTIONS) expect(html).toContain(section.label);
    expect(html).toContain('aria-current="page"');
    expect(html.match(/href="\/settings\/preferences"/g)?.length).toBe(2);
    expect(html).toContain('<a href="/settings/preferences">Ouvrir la page complète');
  });

  it("can be closed", () => {
    expect(html).toContain('aria-label="Fermer les paramètres"');
    expect(html).toContain("settings-drawer-backdrop");
  });
});
