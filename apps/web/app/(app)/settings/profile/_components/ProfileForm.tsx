"use client";

import React, { useId, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AVATAR_UPLOAD_ALLOWED_MIME } from "@cyberlearn/types";
import { SaveBar } from "../../_components/SettingsControls";
import { EASE, MONO, S } from "../../_components/tokens";
import { updateProfileAction } from "../_actions/update-profile";
import { uploadAvatarAction } from "@/lib/avatar/actions";
import { AvatarCropper } from "@/components/avatar-cropper";
import { croppedBlobToFile } from "@/lib/avatar/cropped-file";

const AVATARS = [
  { path: "/avatars/av-1.svg", label: "CYBER" },
  { path: "/avatars/av-2.svg", label: "CIRCUIT" },
  { path: "/avatars/av-3.svg", label: "ALERT" },
  { path: "/avatars/av-4.svg", label: "ORBIT" },
  { path: "/avatars/av-5.svg", label: "SIGNAL" },
  { path: "/avatars/av-6.svg", label: "SHIELD" },
  { path: "/avatars/av-7.svg", label: "NODE" },
  { path: "/avatars/av-8.svg", label: "CL" },
] as const;

const MAX_BIO = 280;

interface ProfileFormProps {
  username: string;
  initialDisplayName: string;
  initialBio: string;
  initialAvatarUrl: string;
  /** Signed URL preview when the current avatar is a custom upload, else null. */
  initialAvatarPreview: string | null;
}

function labelStyle(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontFamily: MONO,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: S.turq,
    marginBottom: 10,
  };
}

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%",
    background: S.base,
    border: `1px solid ${focused ? S.turq : S.border}`,
    color: S.fg,
    fontFamily: MONO,
    fontSize: 14,
    padding: "0 14px",
    height: 46,
    outline: "none",
    boxSizing: "border-box",
    boxShadow: focused ? "0 0 0 1px rgba(10,255,212,0.3), 0 0 14px rgba(10,255,212,0.12)" : "none",
    transition: `all 200ms ${EASE}`,
  };
}

export function ProfileForm({
  username,
  initialDisplayName,
  initialBio,
  initialAvatarUrl,
  initialAvatarPreview,
}: ProfileFormProps): React.JSX.Element {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [bio, setBio] = useState(initialBio);
  const [avatar, setAvatar] = useState(initialAvatarUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [cropFile, setCropFile] = useState<File | null>(null);
  const hasCustomAvatar = avatar.startsWith("__upload:") && initialAvatarPreview !== null;

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropFile(file); // crop before uploading
  }

  function handleCropped(blob: Blob): void {
    const fd = new FormData();
    fd.set("avatar", croppedBlobToFile(blob));
    startUpload(async () => {
      const res = await uploadAvatarAction({}, fd);
      setCropFile(null);
      if (res.ok) {
        toast.success("Photo importée");
        router.refresh();
      } else {
        toast.error(res.error ?? "Échec de l'envoi");
      }
    });
  }
  const [saved, setSaved] = useState({
    displayName: initialDisplayName,
    bio: initialBio,
    avatar: initialAvatarUrl,
  });
  const [focused, setFocused] = useState<"displayName" | "bio" | null>(null);

  const nameId = useId();
  const bioId = useId();
  const usernameId = useId();

  const dirty = displayName !== saved.displayName || bio !== saved.bio || avatar !== saved.avatar;

  function handleSubmit(e: React.SyntheticEvent): void {
    e.preventDefault();
    if (!dirty || pending) return;
    const fd = new FormData();
    fd.set("displayName", displayName);
    fd.set("bio", bio);
    fd.set("avatarUrl", avatar);
    startTransition(async () => {
      const res = await updateProfileAction({}, fd);
      if (res.success) {
        setSaved({ displayName, bio, avatar });
        toast.success("Profil enregistré");
      } else {
        toast.error(res.error ?? "Erreur lors de l'enregistrement");
      }
    });
  }

  function handleCancel(): void {
    setDisplayName(saved.displayName);
    setBio(saved.bio);
    setAvatar(saved.avatar);
  }

  return (
    <form onSubmit={handleSubmit}>
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

      {/* Avatar picker */}
      <div style={{ marginBottom: 24 }}>
        <span style={labelStyle()}>
          <span aria-hidden="true">›</span>Avatar
        </span>
        <div
          role="radiogroup"
          aria-label="Avatar"
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}
        >
          {AVATARS.map(({ path, label }) => {
            const selected = avatar === path;
            return (
              <button
                key={path}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                onClick={() => {
                  setAvatar(path);
                }}
                style={{
                  position: "relative",
                  aspectRatio: "1 / 1",
                  background: selected ? "rgba(10,255,212,0.06)" : S.base,
                  border: `1px solid ${selected ? S.turq : S.border}`,
                  boxShadow: selected
                    ? "0 0 0 1px rgba(10,255,212,0.3), 0 0 20px rgba(10,255,212,0.18)"
                    : "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: `all 200ms ${EASE}`,
                }}
              >
                <Image
                  src={path}
                  alt=""
                  width={44}
                  height={44}
                  style={{ width: "58%", height: "58%", objectFit: "contain" }}
                  unoptimized
                />
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: selected ? S.turq : S.muted,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom upload */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          {hasCustomAvatar && initialAvatarPreview && (
            <span
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                border: `1px solid ${S.turq}`,
                overflow: "hidden",
                display: "inline-block",
              }}
              title="Photo importée"
            >
              {/* Signed URL (private bucket): plain img, not next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={initialAvatarPreview}
                alt="Avatar importé"
                width={44}
                height={44}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_UPLOAD_ALLOWED_MIME.join(",")}
            onChange={handleUpload}
            style={{ display: "none" }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            title="JPEG, PNG ou WebP, 2 Mo maximum"
            style={{
              height: 40,
              padding: "0 16px",
              background: "transparent",
              border: `1px dashed ${S.muted}`,
              color: uploading ? S.muted : S.fg,
              fontFamily: MONO,
              fontWeight: 600,
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: uploading ? "not-allowed" : "pointer",
              transition: `all 200ms ${EASE}`,
            }}
          >
            {uploading ? "Envoi…" : hasCustomAvatar ? "Remplacer la photo" : "Importer une photo"}
          </button>
        </div>
      </div>

      {/* Identifiant + Nom affiché */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}
        className="settings-profile__row"
      >
        <div>
          <label htmlFor={usernameId} style={labelStyle()}>
            <span aria-hidden="true">›</span>Identifiant
          </label>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "stretch",
              background: S.base,
              border: `1px solid ${S.border}`,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                placeItems: "center",
                padding: "0 14px",
                fontFamily: MONO,
                fontSize: 15,
                color: S.muted,
                borderRight: `1px solid ${S.borderSoft}`,
                background: "rgba(5,4,26,0.5)",
              }}
            >
              @
            </span>
            <input
              id={usernameId}
              type="text"
              value={username}
              readOnly
              aria-readonly="true"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: 0,
                color: S.muted,
                fontFamily: MONO,
                fontSize: 14,
                padding: "0 14px",
                height: 46,
                outline: "none",
                cursor: "default",
              }}
            />
          </div>
        </div>
        <div>
          <label htmlFor={nameId} style={labelStyle()}>
            <span aria-hidden="true">›</span>Nom affiché
          </label>
          <input
            id={nameId}
            type="text"
            value={displayName}
            maxLength={64}
            onChange={(e) => {
              setDisplayName(e.target.value);
            }}
            onFocus={() => {
              setFocused("displayName");
            }}
            onBlur={() => {
              setFocused(null);
            }}
            style={inputStyle(focused === "displayName")}
          />
        </div>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor={bioId} style={labelStyle()}>
          <span aria-hidden="true">›</span>Bio courte
        </label>
        <textarea
          id={bioId}
          value={bio}
          maxLength={MAX_BIO}
          onChange={(e) => {
            setBio(e.target.value);
          }}
          onFocus={() => {
            setFocused("bio");
          }}
          onBlur={() => {
            setFocused(null);
          }}
          style={{
            ...inputStyle(focused === "bio"),
            height: "auto",
            minHeight: 80,
            padding: "12px 14px",
            lineHeight: 1.55,
            fontSize: 13.5,
            resize: "vertical",
          }}
        />
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            color: bio.length >= MAX_BIO ? S.warning : S.muted,
            marginTop: 6,
            textAlign: "right",
            letterSpacing: "0.06em",
          }}
        >
          {bio.length} / {MAX_BIO}
        </div>
      </div>

      <SaveBar dirty={dirty} pending={pending} onCancel={handleCancel} />
    </form>
  );
}
