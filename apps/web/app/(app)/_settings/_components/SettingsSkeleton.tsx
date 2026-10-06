import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import type { SettingsSectionKey } from "./sections";
import { S } from "./tokens";

/**
 * The drawer's content area while its data or its forms load, drawn on the
 * sections' own layout: the `// LABEL hint` head, then the section's cards
 * (SettingsCard is the .card surface, padded 28 / 30), their toggle rows,
 * fields and save bar, at their real sizes. The nav beside it is already the
 * real one; the section it shows is the one drawn here (Profil by default,
 * which is where the navbar's gear opens).
 */

const COLUMN: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 28 };

/** SectionHead: the turquoise label and its grey hint, on one baseline. */
function HeadSkeleton({ label, hint }: { label: number; hint: number }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
      <Skeleton w={label} h={11} />
      <Skeleton w={hint} h={10} />
    </div>
  );
}

/** SettingsCard: the elevated panel, its title and, when it has one, its description. */
function CardSkeleton({
  title,
  desc = false,
  children,
}: {
  title: number;
  desc?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="card" style={{ position: "relative", padding: "28px 30px" }}>
      <Skeleton w={title} h={20} style={{ margin: desc ? "5px 0 10px" : "5px 0 11px" }} />
      {desc && (
        <SkeletonText
          lines={2}
          lastWidth="55%"
          lineHeight={13}
          gap={9}
          style={{ maxWidth: 560, marginBottom: 22 }}
        />
      )}
      {children}
    </section>
  );
}

/** The control at the end of a toggle row: a switch, or a segmented choice. */
type Control = "switch" | "choice2" | "choice3";

const CONTROL_SIZE: Record<Control, { w: number; h: number }> = {
  switch: { w: 44, h: 24 },
  choice2: { w: 96, h: 36 },
  choice3: { w: 236, h: 36 },
};

/** ToggleRow: the setting's name over its description, the control at the right. */
function RowSkeleton({
  name,
  control = "switch",
  last = false,
}: {
  name: number;
  control?: Control;
  last?: boolean;
}): React.ReactElement {
  const size = CONTROL_SIZE[control];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 20,
        padding: "16px 0",
        borderBottom: last ? "none" : `1px solid ${S.borderSoft}`,
      }}
    >
      <div style={{ minWidth: 0, flex: "1 1 200px", display: "flex", flexDirection: "column" }}>
        <Skeleton w={name} h={14} style={{ margin: "3px 0 6px" }} />
        <Skeleton w="88%" h={11} style={{ maxWidth: 300 }} />
      </div>
      <Skeleton w={size.w} h={size.h} />
    </div>
  );
}

/** SaveBar: the sync status, then Annuler and Enregistrer at the right. */
function SaveBarSkeleton(): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
        marginTop: 8,
        padding: "14px 20px",
        border: `1px solid ${S.border}`,
      }}
    >
      <Skeleton w={130} h={11} />
      <div
        style={{
          display: "flex",
          flex: "1 1 auto",
          justifyContent: "flex-end",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <Skeleton w={100} h={40} />
        <Skeleton w={144} h={40} />
      </div>
    </div>
  );
}

/** A form field: its `› LABEL` over a 46px input. */
function FieldSkeleton({ label }: { label: number }): React.ReactElement {
  return (
    <div>
      <Skeleton w={label} h={11} style={{ margin: "3px 0 13px" }} />
      <Skeleton h={46} />
    </div>
  );
}

// ── The sections ─────────────────────────────────────────────────────────────

function ProfileSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={64} hint={200} />
      <CardSkeleton title={130}>
        {/* Avatar picker: eight square tiles, four a row, then the upload button */}
        <div style={{ marginBottom: 24 }}>
          <Skeleton w={70} h={11} style={{ margin: "3px 0 13px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} style={{ aspectRatio: "1 / 1" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <Skeleton w={176} h={40} />
          </div>
        </div>

        {/* Identifiant + Nom affiché */}
        <div
          className="settings-profile__row"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}
        >
          <FieldSkeleton label={96} />
          <FieldSkeleton label={110} />
        </div>

        {/* Bio and its counter */}
        <div>
          <Skeleton w={90} h={11} style={{ margin: "3px 0 13px" }} />
          <Skeleton h={80} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <Skeleton w={56} h={10} style={{ margin: "2px 0" }} />
          </div>
        </div>

        <SaveBarSkeleton />
      </CardSkeleton>
    </>
  );
}

function PrivacySkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={130} hint={90} />
      <div style={COLUMN}>
        <CardSkeleton title={250} desc>
          {/* Three visibility options, auto-fit like the real radiogroup */}
          <div
            className="settings-visibility"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 4,
            }}
          >
            {[70, 80, 64].map((name) => (
              <div
                key={name}
                style={{
                  border: `1px solid ${S.border}`,
                  padding: "18px 16px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Skeleton w={16} h={16} radius="circle" />
                  <Skeleton w={name} h={12} />
                </div>
                <SkeletonText lines={2} lastWidth="70%" lineHeight={11} gap={7} />
              </div>
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton title={160}>
          <RowSkeleton name={150} />
          <RowSkeleton name={100} last />
        </CardSkeleton>
        <SaveBarSkeleton />
      </div>
    </>
  );
}

function PreferencesSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={110} hint={190} />
      <CardSkeleton title={180}>
        <RowSkeleton name={56} control="choice3" />
        <RowSkeleton name={64} control="choice2" last />
      </CardSkeleton>
      <CardSkeleton title={100}>
        <RowSkeleton name={150} last />
      </CardSkeleton>
    </>
  );
}

function NotificationsSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={120} hint={60} />
      <div>
        <CardSkeleton title={160}>
          {[150, 170, 130, 160, 140].map((name, i) => (
            <RowSkeleton key={name} name={name} last={i === 4} />
          ))}
        </CardSkeleton>
        <SaveBarSkeleton />
      </div>
    </>
  );
}

function ModerationSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={110} hint={150} />
      <SkeletonText lines={3} lastWidth="45%" lineHeight={13} gap={10} />
      <div style={{ border: `1px solid ${S.border}`, padding: "22px 20px" }}>
        <Skeleton w="62%" h={12} style={{ margin: "3px 0" }} />
      </div>
    </>
  );
}

function AccountSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={76} hint={130} />
      <CardSkeleton title={210}>
        <div style={{ display: "grid", gap: 8 }}>
          <Skeleton w={100} h={10} style={{ margin: "2px 0" }} />
          <Skeleton w={220} h={14} style={{ margin: "3px 0" }} />
          <Skeleton w={104} h={19} style={{ marginTop: 5 }} />
        </div>
      </CardSkeleton>
      <CardSkeleton title={150}>
        <div style={{ display: "grid", gap: 14 }}>
          {[150, 160, 104].map((label) => (
            <div key={label} style={{ display: "grid", gap: 7 }}>
              <Skeleton w={label} h={10} style={{ margin: "2px 0" }} />
              <Skeleton h={46} />
            </div>
          ))}
          <Skeleton h={44} />
        </div>
      </CardSkeleton>
      <CardSkeleton title={220}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center" }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skeleton w={84} h={11} style={{ margin: "2px 0" }} />
            <SkeletonText
              lines={2}
              lastWidth="60%"
              lineHeight={10}
              gap={8}
              style={{ marginTop: 10 }}
            />
          </div>
          <Skeleton w={92} h={44} />
        </div>
      </CardSkeleton>
    </>
  );
}

/** An Article 20 / Article 17 card of the data section. */
function DataCardSkeleton({ cta }: { cta: number }): React.ReactElement {
  return (
    <div className="card card--sunken" style={{ position: "relative", padding: "18px 20px" }}>
      <div
        className="mono-label"
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}
      >
        <Skeleton w={110} h={11} style={{ margin: "2px 0" }} />
        <Skeleton w={52} h={11} style={{ marginLeft: "auto" }} />
      </div>
      <Skeleton w={190} h={24} style={{ margin: "3px 0 13px" }} />
      <SkeletonText
        lines={3}
        lastWidth="50%"
        lineHeight={13}
        gap={9}
        style={{ marginBottom: 12 }}
      />
      <div
        className="mono-label"
        style={{
          paddingTop: 12,
          borderTop: "1px dashed var(--color-border-subtle)",
          marginBottom: 18,
        }}
      >
        <Skeleton w="72%" h={11} style={{ margin: "2px 0", maxWidth: 300 }} />
      </div>
      <Skeleton w={cta} h={36} />
    </div>
  );
}

function DataSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={80} hint={140} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DataCardSkeleton cta={220} />
        <DataCardSkeleton cta={250} />
      </div>
    </>
  );
}

const SECTIONS: Record<SettingsSectionKey, () => React.ReactElement> = {
  profile: ProfileSkeleton,
  privacy: PrivacySkeleton,
  preferences: PreferencesSkeleton,
  notifications: NotificationsSkeleton,
  moderation: ModerationSkeleton,
  account: AccountSkeleton,
  data: DataSkeleton,
};

export function SettingsSkeleton({
  section = "profile",
}: {
  /** The section being opened; Profil when the caller does not say. */
  section?: SettingsSectionKey;
}): React.ReactElement {
  const Section = SECTIONS[section];
  return (
    <div style={COLUMN} aria-busy="true" aria-label="Chargement des paramètres">
      <Section />
    </div>
  );
}
