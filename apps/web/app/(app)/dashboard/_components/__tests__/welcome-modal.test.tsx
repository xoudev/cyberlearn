// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WelcomeModal } from "../welcome-modal";

/**
 * The welcome video's main button said "Lancer ma première leçon" and opened
 * the lesson catalogue. It opens what the mission card under it offers now.
 */

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
});

describe("WelcomeModal", () => {
  it("opens the lesson the mission card offers", async () => {
    render(<WelcomeModal cta={{ href: "/lessons/adresses-ip", label: "Commencer la leçon" }} />);
    const link = await screen.findByRole("link", { name: /Commencer la leçon/ });
    expect(link.getAttribute("href")).toBe("/lessons/adresses-ip");
  });

  it("sends somebody with no path to the paths, as the card does", async () => {
    render(<WelcomeModal cta={{ href: "/paths", label: "Voir les parcours" }} />);
    const link = await screen.findByRole("link", { name: /Voir les parcours/ });
    expect(link.getAttribute("href")).toBe("/paths");
  });

  it("stays shut once seen", () => {
    localStorage.setItem("cl-welcome-seen", "1");
    render(<WelcomeModal cta={{ href: "/paths", label: "Voir les parcours" }} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
