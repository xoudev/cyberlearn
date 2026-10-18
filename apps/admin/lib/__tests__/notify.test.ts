import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: m.success, error: m.error } }));

const { ACTION_FAILED, actionError, notifyResult } = await import("../notify");

/**
 * How a console action's answer becomes a toast: the shapes the actions hand
 * back, what counts as a failure in each, and the errors a form keeps beside
 * its fields instead.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

describe("actionError", () => {
  it("reads the error of an { error?: string } result", () => {
    expect(actionError({})).toBeNull();
    expect(actionError({ error: "Challenge introuvable." })).toBe("Challenge introuvable.");
  });

  it("reads an { ok, error } result, with a fallback when ok is false alone", () => {
    expect(actionError({ ok: true })).toBeNull();
    expect(actionError({ ok: false, error: "Tu es le dernier admin." })).toBe(
      "Tu es le dernier admin.",
    );
    expect(actionError({ ok: false })).toBe(ACTION_FAILED);
    expect(actionError({ ok: false }, "Le statut n'a pas changé.")).toBe(
      "Le statut n'a pas changé.",
    );
  });

  it("reads a { success, error } result", () => {
    expect(actionError({ success: true })).toBeNull();
    expect(actionError({ success: false })).toBe(ACTION_FAILED);
  });

  it("does not take an empty message for a reason", () => {
    expect(actionError({ ok: false, error: "  " })).toBe(ACTION_FAILED);
    expect(actionError({ error: "" })).toBeNull();
    expect(actionError({ error: null, ok: true })).toBeNull();
  });
});

describe("notifyResult", () => {
  it("says the success it was given, and returns true", () => {
    expect(notifyResult({ ok: true }, { success: "Statut mis à jour." })).toBe(true);
    expect(m.success).toHaveBeenCalledWith("Statut mis à jour.");
    expect(m.error).not.toHaveBeenCalled();
  });

  it("stays quiet on a success nobody worded", () => {
    expect(notifyResult({})).toBe(true);
    expect(m.success).not.toHaveBeenCalled();
  });

  it("says the action's own error, and returns false", () => {
    expect(notifyResult({ error: "Leçon introuvable." }, { success: "Supprimée." })).toBe(false);
    expect(m.error).toHaveBeenCalledWith("Leçon introuvable.");
    expect(m.success).not.toHaveBeenCalled();
  });

  it("falls back to the caller's wording, then to a generic one", () => {
    notifyResult({ ok: false }, { error: "Le rôle n'a pas changé." });
    expect(m.error).toHaveBeenLastCalledWith("Le rôle n'a pas changé.");
    notifyResult({ success: false });
    expect(m.error).toHaveBeenLastCalledWith(ACTION_FAILED);
  });

  it("leaves a field's error to the form that shows it", () => {
    expect(notifyResult({ ok: false, error: "Question vide." }, { error: false })).toBe(false);
    expect(m.error).not.toHaveBeenCalled();
    expect(m.success).not.toHaveBeenCalled();
  });
});
