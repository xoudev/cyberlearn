// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pills } from "../pills";
import { Tabs } from "../tabs";

afterEach(cleanup);

describe("Tabs", () => {
  it("is a tab set, with the current one selected and its count beside it", () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="Sections du profil"
        value="badges"
        onChange={onChange}
        items={[
          { key: "activity", label: "Activité", count: 12 },
          { key: "badges", label: "Badges", count: 0 },
          { key: "certs", label: "Certificats" },
        ]}
        trailing={<span>Trier</span>}
      />,
    );
    expect(screen.getByRole("tablist", { name: "Sections du profil" })).toBeTruthy();
    const badges = screen.getByRole("tab", { name: "Badges 0" });
    expect(badges.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Activité 12" }).getAttribute("aria-selected")).toBe(
      "false",
    );
    expect(
      screen.getByRole("tab", { name: "Certificats" }).querySelector(".tabs__count"),
    ).toBeNull();
    expect(screen.getByText("Trier").parentElement?.className).toBe("tabs__trailing");
    fireEvent.click(screen.getByRole("tab", { name: "Activité 12" }));
    expect(onChange).toHaveBeenCalledWith("activity");
  });
});

describe("Pills", () => {
  it("is a group of toggles, the pressed one in the colour of what it filters", () => {
    const onChange = vi.fn();
    render(
      <Pills
        label="Rareté"
        value="rare"
        onChange={onChange}
        items={[
          { key: "all", label: "Tous", count: 9 },
          { key: "rare", label: "Rare", count: 3, color: "#6e8bff" },
        ]}
      />,
    );
    expect(screen.getByRole("group", { name: "Rareté" })).toBeTruthy();
    const rare = screen.getByRole("button", { name: "Rare 3" });
    expect(rare.getAttribute("aria-pressed")).toBe("true");
    expect(rare.style.getPropertyValue("--pill-color")).toBe("#6e8bff");
    expect(rare.querySelector(".pill__dot")).toBeTruthy();
    const all = screen.getByRole("button", { name: "Tous 9" });
    expect(all.getAttribute("aria-pressed")).toBe("false");
    expect(all.querySelector(".pill__dot")).toBeNull();
    fireEvent.click(all);
    expect(onChange).toHaveBeenCalledWith("all");
  });
});
