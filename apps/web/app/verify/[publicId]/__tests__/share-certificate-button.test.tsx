// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareCertificateButton } from "../_components/share-certificate-button";

/** "Partager" on a certificate's public page copies the page's address. */

const URL_TO_SHARE = "https://cyberlearn.fr/verify/22222222-2222-4222-8222-222222222222";
const writeText = vi.fn();

beforeEach(() => {
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
});

describe("ShareCertificateButton", () => {
  it("copies the verification link and says so", async () => {
    render(<ShareCertificateButton url={URL_TO_SHARE} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Partager/ }));
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith(URL_TO_SHARE);
    expect(screen.getByRole("button", { name: /Lien copié/ })).toBeTruthy();
  });
});
