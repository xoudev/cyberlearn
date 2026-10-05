import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { XpProgress } from "../xp-progress";

describe("the XP bar", () => {
  it("says where the reader stands, the next level and the share done", () => {
    const html = renderToStaticMarkup(<XpProgress current={320} needed={500} level={7} />);
    expect(html).toContain("320");
    expect(html).toContain("500");
    expect(html).toContain("Niv. 8");
    expect(html).toContain("64%");
    expect(html).toContain("width:64.0%");
    expect(html).toContain("YOU · 320");
  });

  it("is full at the top, never past it", () => {
    const html = renderToStaticMarkup(<XpProgress current={900} needed={500} level={9} />);
    expect(html).toContain("width:100.0%");
    expect(renderToStaticMarkup(<XpProgress current={0} needed={0} level={1} />)).toContain("100%");
  });
});
