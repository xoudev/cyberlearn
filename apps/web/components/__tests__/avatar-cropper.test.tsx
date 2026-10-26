// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AVATAR_EXPORT_PX, AVATAR_UPLOAD_ERROR } from "@cyberlearn/types";
import { AvatarCropper } from "../avatar-cropper";

const decode = vi.fn<(file: Blob) => Promise<ImageBitmap>>();
const drawImage = vi.fn();
const clearRect = vi.fn();
const encode = vi.fn<(callback: BlobCallback, type?: string, quality?: unknown) => void>();
const bitmap = { width: 560, height: 280, close: vi.fn() };
const exported = new Blob(["cropped pixels"], { type: "image/webp" });

beforeEach(() => {
  vi.clearAllMocks();
  decode.mockReset().mockResolvedValue(bitmap);
  vi.stubGlobal("createImageBitmap", decode);
  // jsdom has no canvas renderer; the cropper only needs these drawing methods.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
    clearRect,
  } as unknown as CanvasRenderingContext2D);
  encode.mockReset().mockImplementation((callback) => {
    callback(exported);
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(encode);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function propsFor(file = new File(["image bytes"], "avatar.png", { type: "image/png" })) {
  return { file, onCancel: vi.fn(), onConfirm: vi.fn<(blob: Blob) => void>() };
}

async function ready(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Valider" }).hasAttribute("disabled")).toBe(false);
  });
}

describe("AvatarCropper", () => {
  it.each(["image/png", "image/jpeg", "image/webp"])(
    "decodes %s into a canvas without putting a file URL in the DOM",
    async (type) => {
      const props = propsFor(new File(["image bytes"], "avatar", { type }));
      const { container, unmount } = render(<AvatarCropper {...props} />);
      await ready();

      expect(decode).toHaveBeenCalledWith(props.file);
      const preview = screen.getByRole("img", { name: "Aperçu du recadrage de l'avatar" });
      expect(preview instanceof HTMLCanvasElement).toBe(true);
      expect(container.querySelector("[src], [srcdoc], object, embed")).toBeNull();
      expect(drawImage).toHaveBeenLastCalledWith(bitmap, -140, 0, 560, 280);
      unmount();
      expect(bitmap.close).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["text/html", "image/svg+xml"])("refuses %s before decoding", (type) => {
    const props = propsFor(new File(["<svg onload='alert(1)'/>"], "avatar.svg", { type }));
    render(<AvatarCropper {...props} />);

    expect(screen.getByRole("alert").textContent).toBe(AVATAR_UPLOAD_ERROR.format);
    expect(decode).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Valider" }).hasAttribute("disabled")).toBe(true);
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("refuses an empty file before decoding", () => {
    render(<AvatarCropper {...propsFor(new File([], "avatar.png", { type: "image/png" }))} />);
    expect(screen.getByRole("alert").textContent).toBe(AVATAR_UPLOAD_ERROR.empty);
    expect(decode).not.toHaveBeenCalled();
  });

  it("reports a decoding error for a broken or mislabeled raster file", async () => {
    decode.mockRejectedValueOnce(new Error("Not an image"));
    render(<AvatarCropper {...propsFor()} />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe(AVATAR_UPLOAD_ERROR.content);
    });
    expect(screen.getByRole("button", { name: "Valider" }).hasAttribute("disabled")).toBe(true);
  });

  it("keeps the crop centered while zooming and exports the same square at avatar resolution", async () => {
    const props = propsFor();
    render(<AvatarCropper {...props} />);
    await ready();

    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), { target: { value: "2" } });
    expect(drawImage).toHaveBeenLastCalledWith(bitmap, -420, -140, 1120, 560);
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    expect(drawImage).toHaveBeenLastCalledWith(
      bitmap,
      210,
      70,
      140,
      140,
      0,
      0,
      AVATAR_EXPORT_PX,
      AVATAR_EXPORT_PX,
    );
    expect(encode).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.9);
    expect(props.onConfirm).toHaveBeenCalledWith(exported);
  });

  it("clamps a drag to the image edges without leaving empty space", async () => {
    render(<AvatarCropper {...propsFor()} />);
    await ready();
    const viewport = screen.getByRole("img").parentElement;
    if (!viewport) throw new Error("Missing crop viewport");
    Object.defineProperty(viewport, "setPointerCapture", { value: vi.fn() });
    Object.defineProperty(viewport, "hasPointerCapture", { value: vi.fn(() => true) });
    const release = vi.fn();
    Object.defineProperty(viewport, "releasePointerCapture", { value: release });

    fireEvent(
      viewport,
      new MouseEvent("pointerdown", { bubbles: true, clientX: 140, clientY: 140 }),
    );
    fireEvent(
      viewport,
      new MouseEvent("pointermove", { bubbles: true, clientX: 2000, clientY: 2000 }),
    );
    expect(drawImage).toHaveBeenLastCalledWith(bitmap, 0, 0, 560, 280);
    fireEvent(viewport, new MouseEvent("pointerup", { bubbles: true }));
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("falls back to JPEG when WebP encoding is unavailable", async () => {
    const jpeg = new Blob(["cropped pixels"], { type: "image/jpeg" });
    encode
      .mockImplementationOnce((callback) => {
        callback(null);
      })
      .mockImplementationOnce((callback) => {
        callback(jpeg);
      });
    const props = propsFor();
    render(<AvatarCropper {...props} />);
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    expect(encode).toHaveBeenLastCalledWith(expect.any(Function), "image/jpeg", 0.9);
    expect(props.onConfirm).toHaveBeenCalledExactlyOnceWith(jpeg);
  });

  it("closes a late bitmap after unmount without drawing or exporting it", async () => {
    let finish: ((bitmap: ImageBitmap) => void) | undefined;
    decode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const props = propsFor();
    const { unmount } = render(<AvatarCropper {...props} />);
    expect(screen.getByRole("status").textContent).toContain("Chargement");
    expect(screen.getByRole("slider").hasAttribute("disabled")).toBe(true);
    unmount();
    await act(async () => {
      if (!finish) throw new Error("Missing decoder resolver");
      finish(bitmap);
      await Promise.resolve();
    });
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    expect(drawImage).not.toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("disables confirmation and zoom during an upload", async () => {
    const props = propsFor();
    const { rerender } = render(<AvatarCropper {...props} />);
    await ready();
    rerender(<AvatarCropper {...props} busy />);
    expect(screen.getByRole("slider").hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Envoi…" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Envoi…" }));
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
