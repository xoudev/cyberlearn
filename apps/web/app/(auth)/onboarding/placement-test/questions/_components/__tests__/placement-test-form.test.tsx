// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLACEMENT_SAMPLE } from "@/test/fixtures/access-data";
import { PlacementTestForm } from "../placement-test-form";

vi.mock("../../_actions/submit-placement", () => ({ submitPlacementTest: vi.fn() }));
afterEach(cleanup);

describe("placement choices", () => {
  it("keeps one answer per question and the server action field names", () => {
    const { container } = render(
      <PlacementTestForm questions={PLACEMENT_SAMPLE} estimatedMinutes={3} />,
    );
    const loop = screen.getByRole("radio", { name: "Une boucle" });
    fireEvent.click(loop);
    fireEvent.click(screen.getByRole("radio", { name: "DNS" }));
    expect(screen.getByRole("status").textContent).toBe("2 / 3 réponses");
    fireEvent.click(screen.getByRole("radio", { name: "Une constante" }));
    const form = container.querySelector("form");
    if (!form) throw new Error("The placement form is missing");
    const data = new FormData(form);
    expect(data.getAll("answer_test-dev")).toEqual(["constant"]);
    expect(data.get("answer_test-network")).toBe("dns");
    expect(data.has("answer_test-cyber")).toBe(false);
    expect(screen.getByRole("status").textContent).toBe("2 / 3 réponses");
  });
  it("requires each question and offers the dashboard without submitting", () => {
    const { container } = render(
      <PlacementTestForm questions={PLACEMENT_SAMPLE} estimatedMinutes={3} />,
    );
    expect(Array.from(container.querySelectorAll("input")).every((input) => input.required)).toBe(
      true,
    );
    expect(container.querySelector("form")?.checkValidity()).toBe(false);
    expect(screen.getByRole("link", { name: /Passer/ }).getAttribute("href")).toBe("/dashboard");
  });
  it("does not submit an empty questionnaire", () => {
    render(<PlacementTestForm questions={[]} estimatedMinutes={0} />);
    expect(screen.getByRole("button", { name: "Valider le test" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
