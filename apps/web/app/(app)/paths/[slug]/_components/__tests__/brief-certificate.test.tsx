// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BriefCertificate } from "../brief-certificate";

/**
 * MISSION.BRIEF's last cell: a certificate on a catalogue path, none on a
 * class path, where claiming one always answered "Parcours introuvable.".
 */

afterEach(() => {
  cleanup();
});

describe("BriefCertificate", () => {
  it("includes the certificate on a catalogue path", () => {
    const { container } = render(<BriefCertificate certifiable certObtained={false} />);
    expect(container.textContent).toBe("Certificatinclus");
  });

  it("says it is available once issued", () => {
    const { container } = render(<BriefCertificate certifiable certObtained />);
    expect(container.textContent).toBe("Certificatdisponible");
  });

  it("promises no certificate on a class path", () => {
    const { container } = render(<BriefCertificate certifiable={false} certObtained={false} />);
    expect(container.textContent).not.toMatch(/Certificat/u);
    expect(container.textContent).toBe("Parcoursde classe");
    expect(screen.getByTitle(/ne délivre pas de certificat/u)).toBeTruthy();
  });
});
