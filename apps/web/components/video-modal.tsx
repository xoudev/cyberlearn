"use client";

import React from "react";
import { ModalShell } from "@cyberlearn/ui";

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  /** Public path to the MP4, e.g. "/videos/launch.mp4". */
  src: string;
  poster?: string;
  /** Small label shown above the player. */
  eyebrow?: string;
  title?: string;
  /** Optional action row rendered below the player (buttons, links). */
  actions?: React.ReactNode;
}

/**
 * The intro video, in the overlay every pop-up on the site shares.
 *
 * The dialog behaviour that used to live here - Escape, backdrop, scroll lock,
 * focus - moved to ModalShell when a second pop-up wanted the same thing. What
 * is left is the video player, with muted autoplay and native playback controls.
 */
export function VideoModal({
  open,
  onClose,
  src,
  poster,
  eyebrow,
  title,
  actions,
}: VideoModalProps): React.ReactElement | null {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      {...(eyebrow !== undefined && { eyebrow })}
      {...(title !== undefined && { title })}
      ariaLabel={title ?? "Vidéo"}
      {...(actions !== undefined && { actions })}
    >
      <video
        src={src}
        poster={poster}
        autoPlay
        muted
        playsInline
        controls
        aria-label={title ?? "Vidéo de présentation"}
        style={{ display: "block", width: "100%", background: "var(--color-bg-base)" }}
      />
    </ModalShell>
  );
}
