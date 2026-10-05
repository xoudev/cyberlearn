import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CopyButton } from "../copy-button";
import { Crumb } from "../crumb";
import { EmptyState } from "../empty-state";
import { StatTile } from "../stat-tile";

describe("the breadcrumb", () => {
  it("writes the prompt, the segments and lights the last one", () => {
    const html = renderToStaticMarkup(<Crumb segments={["parcours"]} />);
    expect(html).toContain('class="pg-crumb"');
    expect(html).toContain("<b>cyberlearn</b>");
    expect(html).toContain('<span class="pg-crumb__leaf">parcours</span>');
    expect(html).toContain("pg-crumb__caret");
  });

  it("links a segment that has an address, and can do without the caret", () => {
    const html = renderToStaticMarkup(
      <Crumb segments={[{ label: "parcours", href: "/paths" }, "guide"]} caret={false} />,
    );
    expect(html).toContain('href="/paths"');
    expect(html).toContain("pg-crumb__link");
    expect(html).toContain('<span class="pg-crumb__leaf">guide</span>');
    expect(html).not.toContain("pg-crumb__caret");
    expect(html.match(/pg-crumb__sep/g)?.length).toBe(2);
  });
});

describe("the empty state", () => {
  it("draws what it is given and nothing else", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Rien ici" message="Reviens plus tard.">
        <button type="button">Réinitialiser</button>
      </EmptyState>,
    );
    expect(html).toContain('<p class="empty-state__title">Rien ici</p>');
    expect(html).toContain("Reviens plus tard.");
    expect(html).toContain('class="empty-state__action"');
    expect(html).not.toContain("empty-state__glyph");
    expect(renderToStaticMarkup(<EmptyState message="Vide." />)).not.toContain(
      "empty-state__title",
    );
  });
});

describe("the stat tile", () => {
  it("names a figure, in the size asked for", () => {
    const html = renderToStaticMarkup(<StatTile label="XP" value="1 200" size="md" />);
    expect(html).toContain("stat-tile--md");
    expect(html).toContain('<div class="stat-tile__value">1 200</div>');
    expect(html).toContain("XP");
  });

  it("numbers the profile's cells and takes any figure as children", () => {
    const html = renderToStaticMarkup(
      <StatTile label="Niveau" idx="01" size="lg" sub="rang" className="profile-stats-cell">
        <b>7</b>
      </StatTile>,
    );
    expect(html).toContain('<span class="stat-tile__idx">01 ·</span>');
    expect(html).toContain("profile-stats-cell");
    expect(html).toContain("<b>7</b>");
    expect(html).not.toContain("stat-tile__value");
    expect(html).toContain('<div class="stat-tile__sub">rang</div>');
  });

  it("colours the figure and centres when asked", () => {
    const html = renderToStaticMarkup(
      <StatTile label="Série" value={3} size="sm" align="center" color="#FFB547" />,
    );
    expect(html).toContain("stat-tile--center");
    expect(html).toContain('style="color:#FFB547"');
  });
});

describe("the copy button", () => {
  it("starts with its label and its quiet look", () => {
    const html = renderToStaticMarkup(<CopyButton text="CL{abc}" ariaLabel="Copier le flag" />);
    expect(html).toContain('class="copy-button"');
    expect(html).toContain(">copier<");
    expect(html).toContain('aria-label="Copier le flag"');
    expect(html).not.toContain("copy-button--copied");
  });
});
