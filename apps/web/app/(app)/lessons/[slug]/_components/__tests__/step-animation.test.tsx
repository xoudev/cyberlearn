// @vitest-environment jsdom
import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlayerCommand } from "../step-animation-player";
import { StepAnimation } from "../step-animation";

/**
 * The stepping around the player: which frames each button asks for, and
 * what is written beside the animation as the frame moves. The Remotion
 * player is replaced by a double that seeks where it is told.
 */

const commands: PlayerCommand[] = [];

vi.mock("../step-animation-player", () => ({
  StepAnimationPlayer: ({
    command,
    onFrame,
  }: {
    command: PlayerCommand;
    onFrame: (frame: number) => void;
  }) => {
    useEffect(() => {
      commands.push(command);
      onFrame(command.from);
    }, [command, onFrame]);
    return <div data-testid="player">{command.type}</div>;
  },
}));

afterEach(() => {
  cleanup();
  commands.length = 0;
});

describe("StepAnimation", () => {
  it("opens on the first step, its text beside the animation", async () => {
    render(<StepAnimation id="a" scene="tcp-handshake" caption="Trois segments." />);
    expect(await screen.findByTestId("player")).toBeTruthy();
    expect(screen.getByText("La poignée de main TCP")).toBeTruthy();
    expect(screen.getByText("1. Avant la connexion")).toBeTruthy();
    expect(screen.getByText(/Le serveur écoute sur le port 443/u)).toBeTruthy();
    expect(screen.getByText("Trois segments.")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("plays the next step from its first frame to its last, and names it", async () => {
    render(<StepAnimation id="a" scene="tcp-handshake" />);
    await screen.findByTestId("player");
    fireEvent.click(screen.getByRole("button", { name: "Suivant ▶" }));
    expect(commands.at(-1)).toMatchObject({ type: "play", from: 60, to: 150 });
    expect(await screen.findByText("2. SYN")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "◀ Précédent" }));
    expect(commands.at(-1)).toMatchObject({ type: "play", from: 0, to: 60 });
    expect(await screen.findByText("1. Avant la connexion")).toBeTruthy();
  });

  it("jumps to a step by its number, and reads everything from the start", async () => {
    render(<StepAnimation id="a" scene="call-stack" />);
    await screen.findByTestId("player");
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(commands.at(-1)).toMatchObject({ type: "play", from: 210, to: 285 });
    expect(await screen.findByText("4. carre(3) renvoie 9")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Tout lire" }));
    expect(commands.at(-1)).toMatchObject({ type: "play", from: 0, to: null });
    expect(screen.getByRole("button", { name: "Pause" })).toBeTruthy();
  });

  it("says what is wrong with an animation rather than breaking the lesson", () => {
    render(<StepAnimation id="a" scene="dns" />);
    expect(screen.getByRole("note").textContent).toContain("Animation indisponible : scene");
  });
});
