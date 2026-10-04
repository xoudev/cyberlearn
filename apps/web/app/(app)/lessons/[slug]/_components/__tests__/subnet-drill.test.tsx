// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { drawSeries, seededRandom } from "@cyberlearn/lib/network/subnet-drill";
import { parseSubnetDrill } from "@cyberlearn/types";
import { afterEach, describe, expect, it } from "vitest";
import { SubnetDrill } from "../subnet-drill";

/**
 * A series drawn with a seed, so the test knows the answers: one right, one
 * retried then corrected, a yes-or-no corrected at once, the end of a series
 * and a new one; and a drill the author got wrong says so.
 */

afterEach(cleanup);

const PROPS = {
  id: "d",
  title: "Pose le calcul",
  kinds: ["hosts"],
  prefixes: { min: 26, max: 26 },
  count: 2,
};

/** The questions the component will draw for these props and this seed. */
function expectedSeries(props: Record<string, unknown>, seed: number) {
  const parsed = parseSubnetDrill(props);
  if (!parsed.ok) throw new Error(parsed.problem);
  return drawSeries(parsed.value, seededRandom(seed));
}

function answer(text: string): void {
  fireEvent.change(screen.getByRole("textbox", { name: "Ta réponse" }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Vérifier" }));
}

describe("SubnetDrill", () => {
  it("asks the first question of the series, and says where it stands", () => {
    const [first] = expectedSeries(PROPS, 1);
    render(<SubnetDrill {...PROPS} rng={seededRandom(1)} />);
    expect(screen.getByText("Question 1 sur 2")).toBeTruthy();
    expect(screen.getByText(first?.prompt ?? "")).toBeTruthy();
    expect(
      screen.getByRole("region", { name: "Calcul de sous-réseaux : Pose le calcul" }),
    ).toBeTruthy();
  });

  it("says yes to the answer, gives the reasoning, then moves on", () => {
    const [first, second] = expectedSeries(PROPS, 1);
    render(<SubnetDrill {...PROPS} rng={seededRandom(1)} />);
    answer(` ${first?.answer ?? ""} `);
    expect(screen.getByText("Juste.").closest("p")?.textContent).toBe(
      `Juste. ${first?.explanation ?? ""}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Question suivante" }));
    expect(screen.getByText("Question 2 sur 2")).toBeTruthy();
    expect(screen.getByText(second?.prompt ?? "")).toBeTruthy();
  });

  it("gives a typed answer a second try, then the correction", () => {
    const [first] = expectedSeries(PROPS, 1);
    render(<SubnetDrill {...PROPS} rng={seededRandom(1)} />);
    answer("1");
    expect(screen.getByText("Non, ce n'est pas ça : essaie encore.")).toBeTruthy();
    expect(screen.queryByText(/la bonne réponse est/u)).toBeNull();
    answer("3");
    expect(screen.getByText(`Non : la bonne réponse est ${first?.answer ?? ""}.`)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Question suivante" })).toBeTruthy();
  });

  it("corrects a yes-or-no at once: the other answer is the right one", () => {
    const props = { ...PROPS, kinds: ["same-subnet"], count: 1 };
    const [first] = expectedSeries(props, 2);
    render(<SubnetDrill {...props} rng={seededRandom(2)} />);
    const wrong = first?.answer === "Oui" ? "Non" : "Oui";
    fireEvent.click(screen.getByRole("button", { name: wrong }));
    expect(screen.getByText(`Non : la bonne réponse est ${first?.answer ?? ""}.`)).toBeTruthy();
    expect(screen.getByRole("button", { name: wrong })).toHaveProperty("disabled", true);
  });

  it("ends with how many were found, and starts a new series on request", () => {
    const props = { ...PROPS, count: 1 };
    const [first] = expectedSeries(props, 3);
    render(<SubnetDrill {...props} rng={seededRandom(3)} />);
    answer(first?.answer ?? "");
    fireEvent.click(screen.getByRole("button", { name: "Voir le résultat" }));
    expect(screen.getByText(/Série terminée/u).closest("p")?.textContent).toBe(
      "Série terminée : 1 trouvée sur 1.",
    );
    expect(screen.getByText(/Tout juste/u)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Nouvelle série" }));
    expect(screen.getByText("Question 1 sur 1")).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Ta réponse" })).toHaveProperty("value", "");
  });

  it("says what is wrong with a drill rather than breaking the lesson", () => {
    render(<SubnetDrill {...PROPS} prefixes={{ min: 24, max: 31 }} />);
    expect(screen.getByRole("note").textContent).toContain("prefixes.max");
  });
});
