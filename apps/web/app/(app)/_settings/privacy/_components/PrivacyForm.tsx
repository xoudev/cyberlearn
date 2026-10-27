"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/components/info-tip";
import { SaveBar, Switch, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { EASE, S, SANS } from "../../_components/tokens";
import { updatePrivacyAction } from "../_actions/update-privacy";

type Visibility = "HIDDEN" | "ANONYMOUS" | "PUBLIC";

interface PrivacyFormProps {
  initialVisibility: Visibility;
  initialPublicProfile: boolean;
  initialFriendsLeaderboard: boolean;
}

const OPTIONS: { id: Visibility; name: string; desc: string; recommended?: boolean }[] = [
  { id: "HIDDEN", name: "Masqué", desc: "Tu n'apparais pas dans le classement public." },
  {
    id: "ANONYMOUS",
    name: "Anonyme",
    desc: "Tu apparais comme « Anonyme », sans ton pseudo ni ton avatar.",
    recommended: true,
  },
  { id: "PUBLIC", name: "Public", desc: "Ton pseudo et ton avatar sont visibles par tous." },
];

/** The InfoTip body detailing what each visibility mode exposes. */
function VisibilityDetail(): React.JSX.Element {
  const row = (term: string, body: string): React.JSX.Element => (
    <span
      style={{
        display: "block",
        marginTop: 7,
        paddingLeft: 14,
        position: "relative",
        color: S.fg2,
      }}
    >
      <span aria-hidden="true" style={{ position: "absolute", left: 0, color: S.accentText }}>
        ›
      </span>
      <strong style={{ color: S.fg, fontWeight: 600 }}>{term}</strong> - {body}
    </span>
  );
  return (
    <>
      <strong style={{ color: S.fg, fontWeight: 600 }}>
        Ce que chaque mode expose dans le classement :
      </strong>
      {row("Masqué", "aucune trace : ni rang, ni pseudo, ni avatar.")}
      {row(
        "Anonyme",
        "ton rang et ton XP comptent, affichés comme « Anonyme ». Pseudo et avatar masqués.",
      )}
      {row("Public", "pseudo, avatar, rang et XP visibles par tous les membres.")}
    </>
  );
}

export function PrivacyForm({
  initialVisibility,
  initialPublicProfile,
  initialFriendsLeaderboard,
}: PrivacyFormProps): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile);
  const [friendsBoard, setFriendsBoard] = useState(initialFriendsLeaderboard);
  const [saved, setSaved] = useState({
    visibility: initialVisibility,
    publicProfile: initialPublicProfile,
    friendsBoard: initialFriendsLeaderboard,
  });

  const dirty =
    visibility !== saved.visibility ||
    publicProfile !== saved.publicProfile ||
    friendsBoard !== saved.friendsBoard;

  function handleSubmit(e: React.SyntheticEvent): void {
    e.preventDefault();
    if (!dirty || pending) return;
    const fd = new FormData();
    fd.set("leaderboardVisibility", visibility);
    fd.set("publicProfile", String(publicProfile));
    fd.set("friendsLeaderboard", String(friendsBoard));
    // A call that fails inside a transition goes to the nearest error boundary,
    // the site's own, and replaces the page under the drawer. It is said in a
    // toast instead, and the choices stay unsaved on the form.
    startTransition(async () => {
      let res: Awaited<ReturnType<typeof updatePrivacyAction>>;
      try {
        res = await updatePrivacyAction({}, fd);
      } catch {
        toast.error("Confidentialité non enregistrée, réessaie.");
        return;
      }
      if (res.success) {
        setSaved({ visibility, publicProfile, friendsBoard });
        toast.success("Confidentialité enregistrée");
      } else {
        toast.error(res.error ?? "Erreur lors de l'enregistrement");
      }
    });
  }

  function handleCancel(): void {
    setVisibility(saved.visibility);
    setPublicProfile(saved.publicProfile);
    setFriendsBoard(saved.friendsBoard);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <SettingsCard
        variant="key"
        title="Visibilité dans le classement"
        desc="Contrôle la manière dont tu apparais sur le leaderboard. Tu peux changer d'avis à tout moment."
        info={
          <InfoTip title="Visibilité · détail">
            <VisibilityDetail />
          </InfoTip>
        }
      >
        <div
          role="radiogroup"
          aria-label="Visibilité dans le classement"
          className="settings-visibility"
          // auto-fit collapses 3 -> 2 -> 1 columns by the real content width, so the
          // cards never get squeezed (and the "Recommandé" badge stops overlapping)
          // when the sidebar leaves a narrow content column at laptop widths.
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 4,
          }}
        >
          {OPTIONS.map((o) => {
            const selected = visibility === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setVisibility(o.id);
                }}
                // The choice passes on chalk; the others stay on carbon.
                style={{
                  position: "relative",
                  textAlign: "left",
                  background: selected ? S.chalk : S.base,
                  border: `1px solid ${selected ? S.chalk : S.borderStrong}`,
                  padding: "18px 16px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
                }}
              >
                {o.recommended ? (
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      fontFamily: SANS,
                      fontSize: 12,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      color: S.onAccent,
                      background: S.accent,
                      padding: "2px 7px",
                    }}
                  >
                    Recommandé
                  </span>
                ) : null}
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      flexShrink: 0,
                      border: `1.5px solid ${selected ? S.ink : S.muted}`,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        inset: 3,
                        background: S.accentInk,
                        opacity: selected ? 1 : 0,
                        transition: `opacity 150ms ${EASE}`,
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontWeight: 600,
                      fontSize: 15,
                      color: selected ? S.ink : S.fg,
                    }}
                  >
                    {o.name}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    lineHeight: 1.45,
                    color: selected ? "#55524d" : S.fg2,
                  }}
                >
                  {o.desc}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Autres réglages">
        <ToggleRow
          name="Visible par mes amis"
          desc="Apparaître, sous ton nom, dans le classement de tes amis."
          info={
            <InfoTip title="Classement entre amis">
              Indépendant du réglage ci-dessus : le classement public, c&apos;est la plateforme
              entière, tes amis sont des gens que tu as acceptés un par un. Tu peux être masqué sur
              l&apos;un et visible sur l&apos;autre, dans les deux sens. Il n&apos;y a pas de mode
              anonyme ici : sur une liste de cinq amis, « Anonyme » n&apos;anonymise personne : on
              sait qui sont ses propres amis. Tu y figures sous ton nom, ou tu n&apos;y figures pas.
            </InfoTip>
          }
        >
          <Switch
            on={friendsBoard}
            label="Visible par mes amis"
            onClick={() => {
              setFriendsBoard((v) => !v);
            }}
          />
        </ToggleRow>

        <ToggleRow
          name="Profil public"
          desc="Rendre ta page profil accessible par lien. Tes amis y ont accès dans tous les cas."
          info={
            <InfoTip title="Profil public">
              Quand activé, ta page profil (badges, certificats, stats) est accessible via un lien
              partageable. Sinon, elle reste privée - sauf pour les personnes que tu as acceptées
              comme amis, qui y ont toujours accès : une demande d&apos;ami en attente, elle, ne
              donne rien. Indépendant du classement.
            </InfoTip>
          }
          last
        >
          <Switch
            on={publicProfile}
            label="Profil public"
            onClick={() => {
              setPublicProfile((v) => !v);
            }}
          />
        </ToggleRow>
      </SettingsCard>

      <SaveBar dirty={dirty} pending={pending} onCancel={handleCancel} />
    </form>
  );
}
