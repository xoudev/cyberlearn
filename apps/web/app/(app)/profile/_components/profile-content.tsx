"use client";

// Tabs choose which already loaded achievements to show without a navigation.
import React, { useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/tabs";
import { BadgeCard } from "@/components/badge-card";
import type { SerializedBadge } from "@/lib/badges/collection";

export interface SerializedLesson {
  lessonId: string;
  slug: string;
  title: string;
  category: string;
  xpReward: number;
  completedDateStr: string | null;
}
export interface SerializedCert {
  id: string;
  publicId: string;
  pathTitle: string;
  issuedDateStr: string;
  sha256Hash: string;
}
interface Props {
  badges: SerializedBadge[];
  lessons: SerializedLesson[];
  certs: SerializedCert[];
}
type ProfileTab = "activity" | "badges" | "certs";
const CATEGORY_NAMES: Record<string, string> = {
  CYBERSEC: "Cybersécurité",
  DEV: "Développement",
  NETWORK: "Réseau",
};

function ProfileEmpty({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}): React.JSX.Element {
  return (
    <div className="profile-empty">
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href={href}>{action}</Link>
    </div>
  );
}

function ActivityFeed({ lessons }: { lessons: SerializedLesson[] }): React.JSX.Element {
  if (lessons.length === 0)
    return (
      <ProfileEmpty
        title="Ta première leçon t’attend."
        description="Tes leçons terminées apparaîtront ici, avec leur date et leurs XP."
        href="/lessons"
        action="Choisir une leçon"
      />
    );
  return (
    <ol className="profile-history">
      {lessons.map((lesson) => (
        <li key={lesson.lessonId}>
          <Link href={`/lessons/${lesson.slug}`}>
            <div>
              <h3>{lesson.title}</h3>
              <p>{CATEGORY_NAMES[lesson.category] ?? lesson.category}</p>
            </div>
            <div className="profile-history__result">
              <span>+{lesson.xpReward} XP</span>
              {lesson.completedDateStr && <span>{lesson.completedDateStr}</span>}
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function CertsSection({ certs }: { certs: SerializedCert[] }): React.JSX.Element {
  const latest = certs[0];
  if (!latest)
    return (
      <ProfileEmpty
        title="Aucun certificat pour l’instant."
        description="Les certificats délivrés après un examen réussi apparaîtront ici. Tu pourras les télécharger et partager leur vérification."
        href="/paths"
        action="Choisir un parcours"
      />
    );
  return (
    <section className="profile-certificate">
      <div className="profile-certificate__head">
        <h2>Dernier certificat délivré</h2>
        {certs.length > 1 && (
          <Link href="/certificates">
            +{certs.length - 1} autre{certs.length > 2 ? "s" : ""} →
          </Link>
        )}
      </div>
      <h3>{latest.pathTitle}</h3>
      <p>
        Délivré le {latest.issuedDateStr} · Référence {latest.publicId}
      </p>
      <p>Empreinte SHA-256</p>
      <code>{latest.sha256Hash}</code>
      <div className="workspace-actions">
        <a href={`/api/certificates/${latest.id}/download`} download className="btn">
          Télécharger PDF
        </a>
        <Link className="workspace-link" href={`/verify/${latest.publicId}`}>
          Vérifier le certificat
        </Link>
      </div>
    </section>
  );
}

export function ProfileContent({ badges, lessons, certs }: Props): React.JSX.Element {
  const [active, setActive] = useState<ProfileTab>("badges");
  const items: { key: ProfileTab; label: string; count: number }[] = [
    { key: "activity", label: "Activité", count: lessons.length },
    { key: "badges", label: "Badges", count: badges.length },
    { key: "certs", label: "Certificats", count: certs.length },
  ];
  return (
    <section className="profile-tabs">
      <Tabs label="Sections du profil" items={items} value={active} onChange={setActive} />
      {active === "activity" && <ActivityFeed lessons={lessons} />}
      {active === "badges" &&
        (badges.length === 0 ? (
          <ProfileEmpty
            title="Tes premiers badges restent à gagner."
            description="Termine des leçons, réussis des quiz et progresse pour obtenir tes premiers badges."
            href="/badges"
            action="Voir les badges à obtenir"
          />
        ) : (
          <div className="profile-realizations badges-workspace">
            {badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        ))}
      {active === "certs" && <CertsSection certs={certs} />}
    </section>
  );
}
