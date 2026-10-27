"use client";

// Avatar selection, cropping and upload progress require browser state.
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
import {
  KEEP_CURRENT_AVATAR,
  ONBOARDING_AVATAR_CHOICES,
  avatarToKeep,
  initialOnboardingChoice,
} from "@cyberlearn/lib/onboarding/avatars";
import { AvatarView } from "@/components/avatar-view";
import { EDIT_PROFILE_QUERY } from "@/lib/onboarding/profile-step";

// The app offers the same eight (@cyberlearn/lib/onboarding/avatars).
const AVATARS = ONBOARDING_AVATAR_CHOICES;

const initialState: SaveAvatarState = {};

interface AvatarFormProps {
  /** As stored: one of the eight, a GitHub address, an upload or glyph marker. */
  currentAvatarUrl: string | null;
  /** The same avatar, drawable: an upload marker resolved to a signed URL. */
  currentAvatarSrc: string | null;
  displayName: string;
}

export function AvatarForm({
  currentAvatarUrl,
  currentAvatarSrc,
  displayName,
}: AvatarFormProps): React.ReactElement {
  const [state, formAction, isPending] = useActionState(saveAvatar, initialState);
  // The avatar the profile already has, if it is none of the eight - GitHub's
  // photo, or one uploaded here before going on to the goals and coming
  // back - is offered first and preselected, rather than replaced by "CL".
  const hasAvatarToKeep = avatarToKeep(currentAvatarUrl) !== null;
  const [selected, setSelected] = useState<string>(() => initialOnboardingChoice(currentAvatarUrl));
  const photoSelected = hasAvatarToKeep && selected === KEEP_CURRENT_AVATAR;

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
    <div className="ob-avatar">
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
      <h1 className="ob-shell__title">Choisis ton avatar.</h1>
      <p className="ob-shell__lede">
        Prends un avatar de la collection ou importe une photo. Tu pourras le changer dans ton
        profil.
      </p>
      {state.error && (
        <p className="ob-error" role="alert">
          {state.error}
        </p>
      )}
      <form action={formAction} className="ob-form">
        <input type="hidden" name="avatarUrl" value={selected} />
        {hasAvatarToKeep && (
          <button
            type="button"
            className="ob-avatar-current"
            aria-pressed={photoSelected}
            disabled={isPending || uploading}
            onClick={() => {
              setSelected(KEEP_CURRENT_AVATAR);
            }}
          >
            <AvatarView
              src={currentAvatarSrc}
              name={displayName}
              glyphSize={28}
              glyphColor={photoSelected ? "#923200" : "#ff864f"}
              className="ob-avatar-current__image"
            />
            <span>Garder ta photo actuelle</span>
          </button>
        )}
        <div className="ob-avatar-grid" role="group" aria-label="Avatars disponibles">
          {AVATARS.map(({ path, label }) => (
            <button
              key={path}
              type="button"
              className="ob-avatar-choice"
              aria-pressed={selected === path}
              disabled={isPending || uploading}
              onClick={() => {
                setSelected(path);
              }}
            >
              <Image
                src={path}
                alt=""
                width={64}
                height={64}
                className="ob-avatar-choice__image"
                unoptimized
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_UPLOAD_ALLOWED_MIME.join(",")}
          onChange={handleFile}
          hidden
        />
        {uploadError && (
          <p className="ob-error" role="alert">
            {uploadError}
          </p>
        )}
        <button
          className="ob-upload"
          type="button"
          disabled={uploading || isPending}
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          {uploading ? "Envoi en cours…" : "Importer une photo"}
        </button>
        <p className="ob-hint">JPEG, PNG ou WebP, 2 Mo maximum.</p>
        <div className="ob-form__actions">
          <Link className="ob-shell__link" href={`/onboarding?${EDIT_PROFILE_QUERY}`}>
            Retour à l’identité
          </Link>
          <button className="btn btn--lg" type="submit" disabled={isPending || uploading}>
            {isPending ? "Enregistrement…" : "Continuer"}
          </button>
        </div>
      </form>
    </div>
  );
}
