"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/components/info-tip";
import { SaveBar, Switch, ToggleRow } from "../../_components/SettingsControls";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { EASE, MONO, S, SANS } from "../../_components/tokens";
import { updatePrivacyAction } from "../_actions/update-privacy";

type Visibility = "HIDDEN" | "ANONYMOUS" | "PUBLIC";

interface PrivacyFormProps {
  initialVisibility: Visibility;
  initialPublicProfile: boolean;
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
      <span aria-hidden="true" style={{ position: "absolute", left: 0, color: S.turq }}>
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
}: PrivacyFormProps): React.JSX.Element {
  const [pending, startTransition] = useTransition();
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [publicProfile, setPublicProfile] = useState(initialPublicProfile);
  const [saved, setSaved] = useState({
    visibility: initialVisibility,
    publicProfile: initialPublicProfile,
  });

  const dirty = visibility !== saved.visibility || publicProfile !== saved.publicProfile;

  function handleSubmit(e: React.SyntheticEvent): void {
    e.preventDefault();
    if (!dirty || pending) return;
    const fd = new FormData();
    fd.set("leaderboardVisibility", visibility);
    fd.set("publicProfile", String(publicProfile));
    startTransition(async () => {
      const res = await updatePrivacyAction({}, fd);
      if (res.success) {
        setSaved({ visibility, publicProfile });
        toast.success("Confidentialité enregistrée");
      } else {
        toast.error(res.error ?? "Erreur lors de l'enregistrement");
      }
    });
  }

  function handleCancel(): void {
    setVisibility(saved.visibility);
    setPublicProfile(saved.publicProfile);
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
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 4 }}
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
                style={{
                  position: "relative",
                  textAlign: "left",
                  background: selected ? "rgba(10,255,212,0.06)" : S.base,
                  border: `1px solid ${selected ? S.turq : o.recommended ? "rgba(10,255,212,0.3)" : S.border}`,
                  boxShadow: selected
                    ? "0 0 0 1px rgba(10,255,212,0.3), 0 0 24px rgba(10,255,212,0.18)"
                    : "none",
                  padding: "18px 16px 16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: `all 200ms ${EASE}`,
                }}
              >
                {o.recommended ? (
                  <span
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      fontFamily: MONO,
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: S.base,
                      background: S.turq,
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
                      borderRadius: "50%",
                      border: `1.5px solid ${selected ? S.turq : S.muted}`,
                      position: "relative",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        inset: 3,
                        borderRadius: "50%",
                        background: S.turq,
                        transform: selected ? "scale(1)" : "scale(0)",
                        boxShadow: selected ? `0 0 8px ${S.turq}` : "none",
                        transition: `transform 200ms ${EASE}`,
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: selected ? S.turq : S.fg,
                    }}
                  >
                    {o.name}
                  </span>
                </span>
                <span style={{ fontFamily: SANS, fontSize: 12.5, lineHeight: 1.45, color: S.fg2 }}>
                  {o.desc}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Autres réglages">
        <ToggleRow
          name="Profil public"
          desc="Rendre ta page profil accessible par lien."
          info={
            <InfoTip title="Profil public">
              Quand activé, ta page profil (badges, certificats, stats) est accessible via un lien
              partageable. Sinon, elle reste privée. Indépendant du classement.
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
