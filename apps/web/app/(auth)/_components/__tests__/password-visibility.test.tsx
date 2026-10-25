// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "../../login/login-form";
import { RegisterForm } from "../../register/register-form";
import { ResetPasswordForm } from "../../reset-password/reset-password-form";

const actions = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  updatePassword: vi.fn(),
  resendConfirmationEmail: vi.fn(),
  restartPasswordRecovery: vi.fn(),
}));
vi.mock("../../_actions/password-auth", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@cyberlearn/db/supabase/client", () => ({ createSupabaseBrowserClient: vi.fn() }));
afterEach(cleanup);

describe("password visibility controls", () => {
  it.each([
    {
      title: "sign-in",
      component: <LoginForm redirectTo="/dashboard" initialError={null} />,
      label: "Mot de passe",
    },
    { title: "registration", component: <RegisterForm />, label: "Mot de passe" },
    { title: "password reset", component: <ResetPasswordForm />, label: "Nouveau mot de passe" },
  ])("keeps the $title password and never submits when revealing it", ({ component, label }) => {
    render(component);
    const input = screen.getByLabelText(label, { exact: true });
    fireEvent.change(input, { target: { value: "typed-password" } });
    const reveal = screen.getByRole("button", { name: "Afficher" });
    expect(reveal.getAttribute("type")).toBe("button");
    fireEvent.click(reveal);
    expect(input.getAttribute("type")).toBe("text");
    expect(screen.getByDisplayValue("typed-password")).toBe(input);
    expect(screen.getByRole("button", { name: "Masquer" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Masquer" }));
    expect(input.getAttribute("type")).toBe("password");
    expect(Object.values(actions).every((action) => action.mock.calls.length === 0)).toBe(true);
  });
});
