// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The profile form calls two server actions inside transitions (the save and
 * the photo upload). A call that throws must be said in a toast, with the form
 * and the cropper left as they were, instead of reaching the error boundary.
 */

const m = vi.hoisted(() => ({
  update: vi.fn<(prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }>>(),
  upload: vi.fn<(prev: unknown, fd: FormData) => Promise<{ ok?: boolean; error?: string }>>(),
  refresh: vi.fn(),
}));

vi.mock("../../_actions/update-profile", () => ({ updateProfileAction: m.update }));
vi.mock("@/lib/avatar/actions", () => ({ uploadAvatarAction: m.upload }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => React.createElement("img", { src, alt }),
}));
// The real cropper rasterises on a canvas, which jsdom does not have: a
// stand-in that hands back a blob on "Valider" is enough to reach the upload.
vi.mock("@/components/avatar-cropper", () => ({
  AvatarCropper: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: (blob: Blob) => void;
    onCancel: () => void;
  }) =>
    React.createElement(
      "div",
      { role: "dialog", "aria-label": "Recadrer l'avatar" },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            onConfirm(new Blob(["x"], { type: "image/webp" }));
          },
        },
        "Valider",
      ),
      React.createElement("button", { type: "button", onClick: onCancel }, "Annuler le recadrage"),
    ),
}));

const { toast } = await import("sonner");
const { ProfileForm } = await import("../ProfileForm");

beforeEach(() => {
  vi.clearAllMocks();
  m.update.mockResolvedValue({ success: true });
  m.upload.mockResolvedValue({ ok: true });
});
afterEach(() => {
  cleanup();
});

function renderForm(): HTMLElement {
  return render(
    <ProfileForm
      username="ada"
      initialDisplayName="Ada"
      initialBio=""
      initialAvatarUrl="/avatars/av-1.svg"
      initialAvatarPreview={null}
    />,
  ).container;
}

function pickPhoto(container: HTMLElement): void {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("file input not found");
  const file = new File(["x"], "photo.png", { type: "image/png" });
  fireEvent.change(input, { target: { files: [file] } });
}

describe("ProfileForm save", () => {
  it("says the profile was not saved, and keeps the edit to save again, when the call fails", async () => {
    m.update.mockRejectedValueOnce(new Error("network"));
    renderForm();
    fireEvent.change(screen.getByLabelText(/Nom affiché/), { target: { value: "Ada L." } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Profil non enregistré, réessaie.");
    });
    expect(toast.success).not.toHaveBeenCalled();
    // Still edited and still unsaved: the bar offers another try.
    expect(screen.getByDisplayValue("Ada L.")).toBeTruthy();
    expect(screen.getByText("Modifications en attente")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enregistrer" }).hasAttribute("disabled")).toBe(
        false,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Profil enregistré");
    });
    expect(screen.getByText("Synchronisé")).toBeTruthy();
  });

  it("still shows the reason the server gives when it refuses the profile", async () => {
    m.update.mockResolvedValueOnce({ error: "Nom trop long." });
    renderForm();
    fireEvent.change(screen.getByLabelText(/Nom affiché/), { target: { value: "Ada L." } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Nom trop long.");
    });
  });
});

describe("ProfileForm photo", () => {
  it("says the photo was not sent, and leaves the cropper open, when the call fails", async () => {
    m.upload.mockRejectedValueOnce(new Error("network"));
    const container = renderForm();
    pickPhoto(container);
    fireEvent.click(await screen.findByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Photo non envoyée, réessaie.");
    });
    expect(toast.success).not.toHaveBeenCalled();
    // The crop is still there to confirm again, and nothing was refreshed.
    expect(screen.getByRole("dialog", { name: "Recadrer l'avatar" })).toBeTruthy();
    expect(m.refresh).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Photo importée");
    });
    expect(screen.queryByRole("dialog", { name: "Recadrer l'avatar" })).toBeNull();
    expect(m.refresh).toHaveBeenCalledTimes(1);
    expect(m.upload).toHaveBeenCalledTimes(2);
  });
});
