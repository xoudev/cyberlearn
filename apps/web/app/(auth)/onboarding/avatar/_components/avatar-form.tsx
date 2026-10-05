"use client";

import React, { useState, useActionState, useRef, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { saveAvatar } from "../_actions/save-avatar";
import type { SaveAvatarState } from "../_actions/save-avatar";
import { uploadAvatarAction } from "@/lib/avatar/actions";
import { AVATAR_UPLOAD_ALLOWED_MIME } from "@cyberlearn/types";
import { AvatarCropper } from "@/components/avatar-cropper";
import { croppedBlobToFile } from "@/lib/avatar/cropped-file";
import Link from "next/link";
import { ONBOARDING_AVATAR_CHOICES } from "@cyberlearn/lib/onboarding/avatars";

// The app offers the same eight (@cyberlearn/lib/onboarding/avatars).
const AVATARS = ONBOARDING_AVATAR_CHOICES;

const initialState: SaveAvatarState = {};

interface AvatarFormProps {
  currentAvatarUrl: string | null;
}

export function AvatarForm({ currentAvatarUrl }: AvatarFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(saveAvatar, initialState);
  const defaultAvatar =
    AVATARS.find((a) => a.path === currentAvatarUrl)?.path ?? "/avatars/av-8.svg";
  const [selected, setSelected] = useState<string>(defaultAvatar);

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploadError(null);
    setCropFile(file); // open the cropper before uploading
  }

  function handleCropped(blob: Blob) {
    const fd = new FormData();
    fd.set("avatar", croppedBlobToFile(blob));
    startUpload(async () => {
      const res = await uploadAvatarAction({}, fd);
      if (res.ok) {
        setCropFile(null);
        // Avatar saved; continue the onboarding flow like save-avatar does.
        router.push("/onboarding/goals");
      } else {
        setCropFile(null);
        setUploadError(res.error ?? "Échec de l'envoi.");
      }
    });
  }

  return (
    <div
      className="card"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 640,
        padding: "32px 36px 28px",
      }}
    >
      {cropFile && (
        <AvatarCropper
          file={cropFile}
          busy={uploading}
          onCancel={() => {
            setCropFile(null);
          }}
          onConfirm={handleCropped}
        />
      )}

      {/* Edge glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -1,
          zIndex: -1,
          background:
            "linear-gradient(135deg, rgba(10,255,212,0.35), rgba(0,36,255,0.25) 50%, transparent 100%)",
          filter: "blur(16px)",
          opacity: 0.55,
        }}
      />

      {/* Corner brackets */}
      {(["tl", "tr", "bl", "br"] as const).map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            border: "1.5px solid var(--color-brand-turquoise)",
            top: pos.startsWith("t") ? 8 : undefined,
            bottom: pos.startsWith("b") ? 8 : undefined,
            left: pos.endsWith("l") ? 8 : undefined,
            right: pos.endsWith("r") ? 8 : undefined,
            borderRight: pos.endsWith("l") ? "none" : undefined,
            borderLeft: pos.endsWith("r") ? "none" : undefined,
            borderBottom: pos.startsWith("t") ? "none" : undefined,
            borderTop: pos.startsWith("b") ? "none" : undefined,
          }}
        />
      ))}

      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          marginBottom: 26,
          borderBottom: "1px solid var(--color-border-subtle)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <h2
          className="mono-label mono-label--md"
          style={{
            fontWeight: 600,
            color: "var(--color-text-primary)",
            margin: 0,
          }}
        >
          <b style={{ color: "var(--color-brand-turquoise)", fontWeight: 700 }}>›</b> CHOISIR TON
          AVATAR
        </h2>
        <span
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
          }}
        >
          02/03
        </span>
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 14,
            color: "var(--color-text-secondary)",
            lineHeight: 1.55,
            margin: "0 0 22px",
          }}
        >
          Choisis un avatar par défaut, ou importe une image. Tu pourras le changer plus tard.
        </p>

        {state.error && (
          <div
            role="alert"
            style={{
              marginBottom: 18,
              padding: "10px 14px",
              background: "rgba(255,71,87,0.08)",
              border: "1px solid rgba(255,71,87,0.4)",
              color: "var(--color-category-cybersec)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
          >
            {state.error}
          </div>
        )}

        <form action={formAction}>
          <input type="hidden" name="avatarUrl" value={selected} />

          {/* Avatar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 22,
            }}
          >
            {AVATARS.map(({ path, label }) => {
              const isSelected = selected === path;
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => {
                    setSelected(path);
                  }}
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    background: isSelected ? "rgba(10,255,212,0.06)" : "var(--color-bg-sunken)",
                    border: `1px solid ${isSelected ? "var(--color-brand-turquoise)" : "var(--color-border-default)"}`,
                    boxShadow: isSelected
                      ? "0 0 0 1px rgba(10,255,212,0.3), 0 0 24px rgba(10,255,212,0.2)"
                      : "none",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "border-color 120ms ease, background 120ms ease",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (isSelected) return;
                    e.currentTarget.style.borderColor = "var(--color-text-muted)";
                    e.currentTarget.style.background = "#07062A";
                  }}
                  onMouseLeave={(e) => {
                    if (isSelected) return;
                    e.currentTarget.style.borderColor = "var(--color-border-default)";
                    e.currentTarget.style.background = "var(--color-bg-sunken)";
                  }}
                >
                  {/* Corner brackets on selected */}
                  {isSelected &&
                    (["tl", "tr", "bl", "br"] as const).map((pos) => (
                      <span
                        key={pos}
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          width: 10,
                          height: 10,
                          border: "1.5px solid var(--color-brand-turquoise)",
                          pointerEvents: "none",
                          top: pos.startsWith("t") ? 4 : undefined,
                          bottom: pos.startsWith("b") ? 4 : undefined,
                          left: pos.endsWith("l") ? 4 : undefined,
                          right: pos.endsWith("r") ? 4 : undefined,
                          borderRight: pos.endsWith("l") ? "none" : undefined,
                          borderLeft: pos.endsWith("r") ? "none" : undefined,
                          borderBottom: pos.startsWith("t") ? "none" : undefined,
                          borderTop: pos.startsWith("b") ? "none" : undefined,
                        }}
                      />
                    ))}

                  <Image
                    src={path}
                    alt={label}
                    width={48}
                    height={48}
                    style={{ width: "60%", height: "60%", objectFit: "contain" }}
                    unoptimized
                  />
                  <span
                    className="mono-label mono-label--xs"
                    style={{
                      color: isSelected
                        ? "var(--color-brand-turquoise)"
                        : "var(--color-text-muted)",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Import a custom photo (uploads then advances) */}
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_UPLOAD_ALLOWED_MIME.join(",")}
            onChange={handleFile}
            style={{ display: "none" }}
          />
          {uploadError && (
            <div
              role="alert"
              style={{
                marginBottom: 12,
                padding: "10px 14px",
                background: "rgba(255,71,87,0.08)",
                border: "1px solid rgba(255,71,87,0.4)",
                color: "var(--color-category-cybersec)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
              }}
            >
              {uploadError}
            </div>
          )}
          <button
            className="mono-label mono-label--md"
            type="button"
            disabled={uploading || isPending}
            onClick={() => fileInputRef.current?.click()}
            title="JPEG, PNG ou WebP, 2 Mo maximum"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              width: "100%",
              height: 52,
              background: "transparent",
              border: "1px dashed var(--color-text-muted)",
              color: uploading ? "var(--color-text-muted)" : "var(--color-text-secondary)",
              fontWeight: 600,
              cursor: uploading || isPending ? "not-allowed" : "pointer",
              marginBottom: 22,
              transition: "border-color 120ms ease, color 120ms ease",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 12 L2 14 L14 14 L14 12" />
              <path d="M8 2 L8 10" />
              <path d="M5 5 L8 2 L11 5" />
            </svg>
            {uploading ? "Envoi en cours…" : "Importer une photo"}
          </button>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <Link
              className="mono-label mono-label--md card card--ghost"
              href="/onboarding"
              style={{
                flex: "0 0 auto",
                height: 52,
                padding: "0 20px",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                textDecoration: "none",
                transition: "border-color 180ms ease, color 180ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-text-muted)";
                e.currentTarget.style.color = "var(--color-text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border-default)";
                e.currentTarget.style.color = "var(--color-text-secondary)";
              }}
            >
              ← Retour
            </Link>

            <button
              className="btn btn--lg"
              type="submit"
              disabled={isPending}
              style={{
                flex: 1,
                opacity: isPending ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (isPending) return;
                e.currentTarget.style.background = "#1F3BFF";
                e.currentTarget.style.boxShadow =
                  "0 0 32px rgba(0,36,255,0.55), inset 0 0 0 1px rgba(255,255,255,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-brand-blue)";
                e.currentTarget.style.boxShadow =
                  "0 0 24px rgba(0,36,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.1)";
              }}
            >
              {isPending ? (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
              ) : (
                <>
                  Continuer <span style={{ fontSize: 16 }}>→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
