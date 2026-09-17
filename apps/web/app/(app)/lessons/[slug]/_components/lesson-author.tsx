import React from "react";
import Image from "next/image";
import Link from "next/link";
import { lessonRepository } from "@cyberlearn/db";
import { resolveAvatarSrc } from "@/lib/avatar/storage";

const HEX_CLIP = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Professeur",
  ADMIN: "Équipe CyberLearn",
};

/**
 * Who wrote this lesson, in the right rail.
 *
 * Replaces the finisher podium that used to sit here: the podium said who was
 * fastest, which tells a reader nothing about the lesson they are about to
 * read, while the byline says who they are reading and lets them open that
 * person's profile.
 *
 * A missing author means a deleted account rather than an unattributed lesson:
 * every path that writes a lesson sets the author, and the column only became
 * nullable so that erasing an account leaves the lesson standing. So the
 * section stays and says the credit is gone, instead of quietly disappearing
 * and making the lesson look like nobody's work.
 */
export async function LessonAuthor({
  lessonId,
}: {
  lessonId: string;
}): Promise<React.ReactElement | null> {
  const lesson = await lessonRepository.findAuthor(lessonId);
  if (!lesson) return null;

  const author = lesson.author;

  // "__upload:" markers become short-lived signed URLs here, at the server
  // boundary; built-ins and "__glyph:" markers pass through and fall back to
  // the monogram below, as everywhere else the avatar is shown small.
  const rawAvatar = author ? await resolveAvatarSrc(author.avatarUrl) : null;

  const isPublic = author?.preferences?.publicProfile !== false;
  const name = author
    ? isPublic
      ? // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        author.displayName.trim() || author.username || "Sans nom"
      : "Anonyme"
    : "Compte supprimé";
  const avatar =
    isPublic && rawAvatar !== null && !rawAvatar.startsWith("__glyph:") ? rawAvatar : null;
  const profileUrl = author && isPublic && author.username ? `/u/${author.username}` : null;
  const roleLabel = author && isPublic ? ROLE_LABEL[author.role] : undefined;

  const date = lesson.publishedAt ?? lesson.createdAt;
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  const card = (
    <div
      className="lesson-author-card"
      style={{
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          clipPath: HEX_CLIP,
          background: author
            ? "color-mix(in srgb, var(--cosmetic-accent) 22%, #110F33)"
            : "#110F33",
          display: "grid",
          placeItems: "center",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            fill
            style={{ objectFit: "cover", clipPath: HEX_CLIP }}
            sizes="34px"
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              // On the accent-tinted hexagon, which is dark: the accent itself
              // reads, near-black does not.
              color: author ? "var(--cosmetic-accent)" : "#6B6890",
            }}
          >
            {author ? name.charAt(0).toUpperCase() : "?"}
          </span>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 13,
            lineHeight: 1.3,
            color: author ? "#F5F5FA" : "#6B6890",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            lineHeight: 1.45,
            letterSpacing: "0.06em",
            color: "#6B6890",
            // Wraps rather than truncating: the rail is narrow, and "Équipe
            // CyberLearn · 3 février 2026" would lose the date to an ellipsis.
          }}
        >
          {roleLabel !== undefined && (
            <span style={{ color: "var(--cosmetic-accent)" }}>{roleLabel} · </span>
          )}
          {dateStr}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#3F3D5C",
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: "1px solid #1F1B47",
        }}
      >
        Écrit par
      </div>

      {profileUrl ? (
        <Link href={profileUrl} style={{ textDecoration: "none" }} title={`Profil de ${name}`}>
          {card}
        </Link>
      ) : (
        card
      )}
    </div>
  );
}
