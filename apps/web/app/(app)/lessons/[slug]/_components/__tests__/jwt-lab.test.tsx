// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JwtLab } from "../jwt-lab";

/**
 * The lab walks a learner through a token: taken apart, forged against three
 * services that are wrong on purpose, replayed against the same services once
 * corrected. Each step is validated in the component, and the corrected
 * services refuse what the flawed ones took.
 */

afterEach(cleanup);

const ADMIN =
  '{"sub":"alice","role":"admin","iss":"cyberlearn-sandbox","aud":"sandbox-api","iat":1767225600,"exp":1767229200}';

const type = (label: string, value: string): void => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};
const press = (name: string | RegExp): void => {
  fireEvent.click(screen.getByRole("button", { name }));
};
const level = (name: string | RegExp): void => {
  press(name);
};

describe("JwtLab", () => {
  it("says what is wrong with a lab rather than breaking the lesson", () => {
    render(<JwtLab id="j" levels={["rsa"]} />);
    expect(screen.getByRole("note").textContent).toContain("levels.0");
    cleanup();
    render(<JwtLab id="j" levels={["decode", "fixed"]} />);
    expect(screen.getByRole("note").textContent).toContain("sans attaque à rejouer");
  });

  it("opens the first step, and counts the steps done", () => {
    render(<JwtLab id="j" title="Les jetons" />);
    expect(screen.getByRole("button", { name: "1. Lire" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("0 / 5 étapes")).toBeTruthy();
    expect(screen.getByLabelText("Jeton d'alice").textContent.split(".")).toHaveLength(3);
  });

  it("decodes the three parts, and wants the lifetime of the token in an hour's many spellings", () => {
    render(<JwtLab id="j" levels={["decode", "none"]} />);
    press("Décoder la charge utile");
    expect(screen.getByLabelText("Charge utile décodé").textContent).toContain('"role": "user"');
    press("Décoder la signature");
    expect(screen.getByLabelText("Signature décodé").textContent).toMatch(/^32 octets/u);

    fireEvent.change(screen.getByLabelText("Durée de validité du jeton"), {
      target: { value: "60" },
    });
    press("Vérifier");
    expect(screen.getByText(/Non, ce n'est pas encore ça/u).textContent).toContain("Indice");
    expect(screen.queryByText("POURQUOI")).toBeNull();

    fireEvent.change(screen.getByLabelText("Durée de validité du jeton"), {
      target: { value: "une heure" },
    });
    press("Vérifier");
    expect(screen.getByText(/Une heure/u)).toBeTruthy();
    expect(screen.getByText("POURQUOI")).toBeTruthy();
    expect(screen.getByText("1 / 2 étapes")).toBeTruthy();
  });

  it("lets alg: none through service A, and only once the token says so", () => {
    render(<JwtLab id="j" levels={["none"]} />);
    // The token as it is handed out is alice, a plain user: not a forgery.
    press("Envoyer au service A");
    expect(screen.getByText("✓ Jeton accepté")).toBeTruthy();
    expect(screen.getByText(/Pas encore/u).parentElement?.textContent).toContain("Indice");
    expect(screen.queryByText("POURQUOI")).toBeNull();

    // Admin in the payload but the signature kept: the signature does not fit.
    type("Charge utile (JSON)", ADMIN);
    press("Envoyer au service A");
    expect(screen.getByText("✗ Jeton refusé")).toBeTruthy();
    expect(screen.getByText(/Signature invalide/u)).toBeTruthy();

    type("En-tête (JSON)", '{"alg":"none","typ":"JWT"}');
    fireEvent.click(screen.getByLabelText("Aucune signature"));
    expect(screen.getByLabelText("Ton jeton forgé").textContent.endsWith(".")).toBe(true);
    press("Envoyer au service A");
    expect(screen.getByText(/Forgé : le service A te prend pour un administrateur/u)).toBeTruthy();
    expect(screen.getByText("POURQUOI")).toBeTruthy();
    expect(screen.getByText("1 / 1 étapes")).toBeTruthy();
  });

  it("says a JSON text is wrong while it is typed", () => {
    render(<JwtLab id="j" levels={["none"]} />);
    type("En-tête (JSON)", "{");
    expect(screen.getByText("Ce n'est pas du JSON valide.")).toBeTruthy();
    type("En-tête (JSON)", "[1]");
    expect(screen.getByText("Le JSON doit être un objet, entre accolades.")).toBeTruthy();
  });

  it("finds the weak secret in the dictionary, then signs with it", () => {
    render(<JwtLab id="j" levels={["weak-secret"]} />);
    // The code of the service does not give the secret away.
    expect(screen.getByLabelText("Code du service B").textContent).not.toContain("soleil");
    press("Lancer le dictionnaire");
    expect(screen.getByText(/Secret trouvé : « soleil » à l'essai 27 sur 40/u)).toBeTruthy();
    press(/Signer avec « soleil »/u);
    expect(screen.getByLabelText("Secret HMAC")).toHaveProperty("value", "soleil");

    // alg: none is not welcome here, the HMAC is.
    type("En-tête (JSON)", '{"alg":"none","typ":"JWT"}');
    type("Charge utile (JSON)", ADMIN);
    press("Envoyer au service B");
    expect(
      screen.getByText(/alg = none : un jeton sans signature n'est pas accepté/u),
    ).toBeTruthy();
    type("En-tête (JSON)", '{"alg":"HS256","typ":"JWT"}');
    press("Envoyer au service B");
    expect(screen.getByText(/Forgé : le service B te prend pour un administrateur/u)).toBeTruthy();
  });

  it("tells a word that fits from one that does not", () => {
    render(<JwtLab id="j" levels={["weak-secret"]} />);
    type("Mot à essayer comme secret", "dragon");
    expect(screen.getByText(/« dragon » ne redonne pas la signature/u)).toBeTruthy();
    type("Mot à essayer comme secret", "soleil");
    expect(screen.getByText(/« soleil » redonne la signature du jeton/u)).toBeTruthy();
  });

  it("confuses service C with its own public key, for an RSA key and an EC key alike", () => {
    render(<JwtLab id="j" levels={["confusion"]} />);
    expect(screen.getByLabelText("Clé publique du service (PEM)").textContent).toContain(
      "BEGIN PUBLIC KEY",
    );
    type("En-tête (JSON)", '{"alg":"HS256","typ":"JWT"}');
    type("Charge utile (JSON)", ADMIN);
    // HMAC with a secret that is not the key: refused.
    fireEvent.click(screen.getByLabelText("HMAC-SHA256 avec ce secret"));
    type("Secret HMAC", "secret");
    press(/Envoyer au service C \(clé RSA\)/u);
    expect(screen.getByText("✗ Jeton refusé")).toBeTruthy();
    // With the public key, taken as it stands: accepted.
    press("Prendre la clé publique du service comme secret");
    press(/Envoyer au service C \(clé RSA\)/u);
    expect(
      screen.getByText(/Forgé : le service C \(clé RSA\) te prend pour un administrateur/u),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Service C \(clé RSA\) ✓/u })).toBeTruthy();

    press("Service C (clé EC)");
    expect(screen.getByLabelText("Clé publique du service (PEM)").textContent).toContain(
      "BEGIN PUBLIC KEY",
    );
    type("En-tête (JSON)", '{"alg":"HS256","typ":"JWT"}');
    type("Charge utile (JSON)", ADMIN);
    press("Prendre la clé publique du service comme secret");
    press(/Envoyer au service C \(clé EC\)/u);
    expect(
      screen.getByText(/Forgé : le service C \(clé EC\) te prend pour un administrateur/u),
    ).toBeTruthy();
  });

  it("replays the attacks against the corrected services, and keeps alice's token working", () => {
    render(<JwtLab id="j" levels={["none", "fixed"]} />);
    // Forge the token of the first step, so that the replay is the learner's own.
    type("En-tête (JSON)", '{"alg":"none","typ":"JWT"}');
    type("Charge utile (JSON)", ADMIN);
    fireEvent.click(screen.getByLabelText("Aucune signature"));
    press("Envoyer au service A");
    level(/^5\. Corrigé/u);

    expect(screen.getByText("ton jeton")).toBeTruthy();
    expect(screen.getByText("jeton légitime")).toBeTruthy();
    expect(screen.queryByText("POURQUOI")).toBeNull();
    press("Rejouer : alg: none, contre le service A");
    expect(screen.getByText("✓ Refusé, comme il faut.")).toBeTruthy();
    expect(screen.getByText(/n'est pas accepté/u)).toBeTruthy();
    expect(screen.getByLabelText("Code corrigé du service A").textContent).toContain(
      'alg !== "HS256"',
    );
    expect(screen.queryByText("POURQUOI")).toBeNull();

    press("Envoyer : Le jeton d'alice, contre le service A");
    expect(screen.getByText(/Accepté, comme il faut/u)).toBeTruthy();
    expect(screen.getByText("POURQUOI")).toBeTruthy();
    expect(screen.getByText("2 / 2 étapes")).toBeTruthy();
  });

  it("falls back on the lesson's attack for a step the learner did not play", () => {
    render(<JwtLab id="j" levels={["weak-secret", "fixed"]} />);
    level(/^5\. Corrigé/u);
    expect(screen.getByText("attaque type")).toBeTruthy();
    press("Rejouer : Secret deviné, contre le service B");
    expect(
      screen.getByText(
        /Signature HMAC recalculée avec le secret du service : elle ne correspond pas/u,
      ),
    ).toBeTruthy();
    expect(screen.getByText("✓ Refusé, comme il faut.")).toBeTruthy();
  });
});
