import React from "react";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import type { SettingsSectionKey } from "./sections";
import { S } from "./tokens";

/**
 * The drawer's content area while its data or its forms load, drawn on the
 * sections' own layout: the `// LABEL hint` head, then the section's cards
 * (SettingsCard is the .card surface, padded 28 / 30), their toggle rows,
 * fields and save bar, at their real sizes. The nav beside it is already the
 * real one. Bars that stand for a line of text carry that text's natural
 * width, capped at the line, so a row wraps where the real one does (the
 * drawer is 680px wide, so most switches drop under their description).
 * Profil by default, which is where the navbar's gear opens.
 */

const COLUMN: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 28 };

/** A line of text of a known natural width, never wider than its box. */
function Line({
  w,
  h,
  style,
}: {
  w: number;
  h: number;
  style?: React.CSSProperties;
}): React.ReactElement {
  return <Skeleton w={w} h={h} style={{ maxWidth: "100%", ...style }} />;
}

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
      <Line w={title} h={20} style={{ margin: "5px 0 11px" }} />
      {desc && (
        <SkeletonText
          lines={2}
          lastWidth="62%"
          lineHeight={13}
          gap={9}
          style={{ maxWidth: 560, margin: "4px 0 26px" }}
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

/**
 * ToggleRow: the setting's name over its description, the control at the
 * right, or under them when they need the whole line. `desc` is the natural
 * width of the description; `tail`, its second line when it wraps.
 */
function RowSkeleton({
  name,
  desc,
  tail,
  control = "switch",
  last = false,
}: {
  name: number;
  desc: number;
  tail?: number;
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
      <div style={{ minWidth: 0 }}>
        <Line w={name} h={14} style={{ margin: "4px 0 6px" }} />
        <Line w={desc} h={11} style={{ margin: "3px 0" }} />
        {tail !== undefined && <Line w={tail} h={11} style={{ margin: "7px 0 3px" }} />}
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
      <Skeleton w={96} h={11} style={{ margin: "3px 0" }} />
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

/** A form field of the profile: its `› LABEL` over a 46px input. */
function FieldSkeleton({ label }: { label: number }): React.ReactElement {
  return (
    <div>
      <Line w={label} h={11} style={{ margin: "3px 0 13px" }} />
      <Skeleton h={46} />
    </div>
  );
}

// ── The sections ─────────────────────────────────────────────────────────────

function ProfileSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={76} hint={218} />
      <CardSkeleton title={125}>
        {/* Avatar picker: eight square tiles, four a row, then the upload button */}
        <div style={{ marginBottom: 24 }}>
          <Line w={63} h={11} style={{ margin: "3px 0 13px" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} style={{ aspectRatio: "1 / 1" }} />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
            <Skeleton w={174} h={40} />
          </div>
        </div>

        {/* Identifiant + Nom affiché, stacked on a narrow screen */}
        <div
          className="settings-profile__row"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}
        >
          <FieldSkeleton label={103} />
          <FieldSkeleton label={103} />
        </div>

        {/* Bio and its counter */}
        <div>
          <Line w={95} h={11} style={{ margin: "3px 0 13px" }} />
          <Skeleton h={80} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <Skeleton w={46} h={10} style={{ margin: "2px 0" }} />
          </div>
        </div>

        <SaveBarSkeleton />
      </CardSkeleton>
    </>
  );
}

/** The three visibility options: the second is the recommended one. */
const VISIBILITY = [
  { name: 56, desc: [275], recommended: false },
  { name: 64, desc: [367, 24], recommended: true },
  { name: 52, desc: [300], recommended: false },
] as const;

function PrivacySkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={151} hint={88} />
      <div style={COLUMN}>
        <CardSkeleton title={300} desc>
          {/* auto-fit like the real radiogroup: one column in the drawer */}
          <div
            className="settings-visibility"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 4,
            }}
          >
            {VISIBILITY.map((option) => (
              <div
                key={option.name}
                style={{
                  position: "relative",
                  border: `1px solid ${S.border}`,
                  padding: "18px 16px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {option.recommended && (
                  <Skeleton w={86} h={17} style={{ position: "absolute", top: 12, right: 12 }} />
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Skeleton w={16} h={16} radius="circle" />
                  <Line w={option.name} h={12} style={{ margin: "3px 0" }} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {option.desc.map((w) => (
                    <Line key={w} w={w} h={11} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardSkeleton>
        <CardSkeleton title={155}>
          <RowSkeleton name={154} desc={356} />
          <RowSkeleton name={100} desc={519} tail={118} last />
        </CardSkeleton>
        <SaveBarSkeleton />
      </div>
    </>
  );
}

function PreferencesSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={117} hint={197} />
      <CardSkeleton title={190}>
        <RowSkeleton name={40} desc={481} tail={80} control="choice3" />
        <RowSkeleton name={48} desc={138} control="choice2" last />
      </CardSkeleton>
      <CardSkeleton title={95}>
        <RowSkeleton name={139} desc={656} tail={255} last />
      </CardSkeleton>
    </>
  );
}

function NotificationsSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={134} hint={61} />
      <div>
        <CardSkeleton title={165}>
          <RowSkeleton name={146} desc={275} />
          <RowSkeleton name={108} desc={600} tail={200} />
          <RowSkeleton name={116} desc={312} />
          <RowSkeleton name={139} desc={319} last />
        </CardSkeleton>
        <SaveBarSkeleton />
      </div>
    </>
  );
}

function ModerationSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={109} hint={136} />
      <SkeletonText
        lines={4}
        lastWidth="40%"
        lineHeight={13}
        gap={10}
        style={{ margin: "5px 0" }}
      />
      <div style={{ border: `1px solid ${S.border}`, padding: "22px 20px" }}>
        <Line w={410} h={12} style={{ margin: "3px 0" }} />
      </div>
    </>
  );
}

function AccountSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={75} hint={129} />
      <CardSkeleton title={215}>
        <div style={{ display: "grid", gap: 8 }}>
          <Skeleton w={96} h={10} style={{ margin: "2px 0" }} />
          <Line w={220} h={14} style={{ margin: "3px 0" }} />
          <Skeleton w={96} h={21} style={{ marginTop: 5 }} />
        </div>
      </CardSkeleton>
      <CardSkeleton title={125}>
        <div style={{ display: "grid", gap: 14 }}>
          {[125, 132, 80].map((label) => (
            <div key={label} style={{ display: "grid", gap: 7 }}>
              <Skeleton w={label} h={10} style={{ margin: "2px 0" }} />
              <Skeleton h={46} />
            </div>
          ))}
          <Skeleton h={44} />
        </div>
      </CardSkeleton>
      <CardSkeleton title={240}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Skeleton w={76} h={11} style={{ margin: "2px 0" }} />
            <SkeletonText
              lines={3}
              lastWidth="45%"
              lineHeight={10}
              gap={8}
              style={{ marginTop: 11 }}
            />
          </div>
          <Skeleton w={86} h={44} />
        </div>
      </CardSkeleton>
    </>
  );
}

/** An Article 20 / Article 17 card of the data section. */
function DataCardSkeleton({ eyebrow, cta }: { eyebrow: number; cta: number }): React.ReactElement {
  return (
    <div className="card card--sunken" style={{ position: "relative", padding: "18px 20px" }}>
      <div
        className="mono-label"
        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}
      >
        <Skeleton w={eyebrow} h={11} style={{ margin: "2px 0" }} />
        <Skeleton w={52} h={11} style={{ marginLeft: "auto" }} />
      </div>
      <Line w={180} h={24} style={{ margin: "6px 0 16px" }} />
      <SkeletonText
        lines={3}
        lastWidth="35%"
        lineHeight={13}
        gap={9}
        style={{ margin: "5px 0 17px" }}
      />
      <div
        className="mono-label"
        style={{
          paddingTop: 12,
          borderTop: "1px dashed var(--color-border-subtle)",
          marginBottom: 18,
        }}
      >
        <Line w={340} h={11} style={{ margin: "2px 0" }} />
      </div>
      <Line w={cta} h={36} />
    </div>
  );
}

function DataSkeleton(): React.ReactElement {
  return (
    <>
      <HeadSkeleton label={84} hint={136} />
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <DataCardSkeleton eyebrow={110} cta={232} />
        <DataCardSkeleton eyebrow={104} cta={258} />
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
