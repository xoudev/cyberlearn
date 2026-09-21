import React from "react";
import { fonts, palette } from "../theme";

/**
 * The web platform, drawn rather than screenshotted.
 *
 * Screenshotting the real site would need a signed-in session and a seeded
 * database inside the render, which is a lot of machinery for four frames -
 * and it would break every time somebody moves a button. These are drawn the
 * same way the phone screens in screens.tsx are, and held to the same rule:
 * the words are the product's own words. "Reprends ton parcours.", the
 * numbered eyebrows, "Tous les parcours →" - all of it is what the dashboard
 * actually says, so the video sells the thing that exists.
 */

export type WebScreenName = "dashboard" | "lesson" | "teacher";

const ui = {
  eyebrow: {
    color: palette.brandTurquoise,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  h: {
    color: palette.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: -0.6,
  },
  body: {
    color: palette.textSecondary,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 1.5,
  },
  micro: {
    color: palette.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
  },
  cta: {
    color: palette.brandTurquoise,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
} as const;

function Section({
  eyebrow,
  title,
  cta,
  children,
}: {
  eyebrow: string;
  title: string;
  cta?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ ...ui.eyebrow, marginBottom: 8 }}>{eyebrow}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
        }}
      >
        <div style={ui.h}>{title}</div>
        {cta !== undefined ? <div style={ui.cta}>{cta}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Panel({
  children,
  accent,
  style,
}: {
  children: React.ReactNode;
  accent?: string;
  style?: React.CSSProperties;
}): React.JSX.Element {
  return (
    <div
      style={{
        padding: 18,
        border: `1px solid ${palette.borderDefault}`,
        borderLeft: `${accent !== undefined ? 3 : 1}px solid ${accent ?? palette.borderDefault}`,
        backgroundColor: palette.bgElevated,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Bar({ value }: { value: number }): React.JSX.Element {
  return (
    <div
      style={{
        height: 8,
        border: `1px solid ${palette.borderDefault}`,
        backgroundColor: palette.bgBase,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${String(value)}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${palette.brandBlue}, ${palette.brandTurquoise})`,
        }}
      />
    </div>
  );
}

function TopBar(): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "0 30px",
        height: 58,
        borderBottom: `1px solid ${palette.borderDefault}`,
        backgroundColor: palette.bgElevated,
      }}
    >
      <div
        style={{
          color: palette.textPrimary,
          fontFamily: fonts.sans,
          fontSize: 16,
          fontWeight: 800,
          letterSpacing: 1.4,
        }}
      >
        CYBER<span style={{ color: palette.brandTurquoise }}>LEARN</span>
      </div>
      {["Tableau de bord", "Parcours", "Leçons", "Ma classe", "Forum"].map((item, i) => (
        <div
          key={item}
          style={{
            ...ui.micro,
            fontSize: 10.5,
            color: i === 0 ? palette.brandTurquoise : palette.textMuted,
          }}
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function DashboardScreen(): React.JSX.Element {
  const paths: { name: string; tag: string; color: string; pct: number; note: string }[] = [
    {
      name: "Fondamentaux de la cybersécurité",
      tag: "Cybersécurité",
      color: palette.category.CYBERSEC,
      pct: 62,
      note: "8 / 13 leçons",
    },
    {
      name: "Réseaux : du câble au paquet",
      tag: "Réseau",
      color: palette.category.NETWORK,
      pct: 25,
      note: "3 / 12 leçons",
    },
    {
      name: "Développer proprement",
      tag: "Développement",
      color: palette.category.DEV,
      pct: 0,
      note: "14 leçons",
    },
  ];

  return (
    <div style={{ height: "100%", backgroundColor: palette.bgBase }}>
      <TopBar />
      <div style={{ padding: "26px 30px" }}>
        <Section eyebrow="01 · parcours" title="Reprends ton parcours." cta="Tous les parcours →">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {paths.map((p) => (
              <Panel key={p.name} accent={p.color}>
                <div style={{ ...ui.micro, color: p.color, fontSize: 9.5 }}>{p.tag}</div>
                <div
                  style={{
                    ...ui.h,
                    fontSize: 15,
                    margin: "10px 0 14px",
                    lineHeight: 1.25,
                    minHeight: 38,
                  }}
                >
                  {p.name}
                </div>
                <Bar value={p.pct} />
                <div style={{ ...ui.micro, fontSize: 9, marginTop: 9 }}>{p.note}</div>
              </Panel>
            ))}
          </div>
        </Section>

        <Section eyebrow="04 · progression" title="Où tu en es.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { n: "42", l: "leçons terminées" },
              { n: "12", l: "jours de série" },
              { n: "9", l: "badges" },
              { n: "2", l: "certificats" },
            ].map((s) => (
              <Panel key={s.l}>
                <div
                  style={{
                    color: palette.brandTurquoise,
                    fontFamily: fonts.sans,
                    fontSize: 34,
                    fontWeight: 800,
                  }}
                >
                  {s.n}
                </div>
                <div style={{ ...ui.micro, fontSize: 9, marginTop: 6 }}>{s.l}</div>
              </Panel>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function LessonScreen(): React.JSX.Element {
  return (
    <div style={{ height: "100%", backgroundColor: palette.bgBase }}>
      <TopBar />
      <div style={{ padding: "26px 30px" }}>
        <div style={{ ...ui.eyebrow, marginBottom: 8 }}>Cybersécurité · Intermédiaire</div>
        <div style={{ ...ui.h, fontSize: 30, marginBottom: 18 }}>Sécuriser une API REST</div>

        <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 18 }}>
          <div style={{ display: "grid", gap: 14 }}>
            <Panel>
              <div style={{ ...ui.body, fontSize: 13.5 }}>
                Une API qui expose ses jetons dans l&apos;URL les expose aussi dans les journaux du
                serveur, dans l&apos;historique du navigateur et dans l&apos;en-tête Referer. Le
                jeton voyage dans l&apos;en-tête Authorization, jamais ailleurs.
              </div>
            </Panel>
            <Panel accent={palette.brandTurquoise}>
              <div style={{ ...ui.micro, fontSize: 9, marginBottom: 10 }}>Terminal intégré</div>
              <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 12,
                  lineHeight: 1.75,
                  color: palette.textSecondary,
                }}
              >
                <div>
                  <span style={{ color: palette.brandTurquoise }}>$</span> curl -i
                  https://api.local/me
                </div>
                <div style={{ color: palette.danger }}>HTTP/1.1 401 Unauthorized</div>
                <div>
                  <span style={{ color: palette.brandTurquoise }}>$</span> curl -H
                  &quot;Authorization: Bearer …&quot; https://api.local/me
                </div>
                <div style={{ color: palette.brandTurquoise }}>HTTP/1.1 200 OK</div>
              </div>
            </Panel>
          </div>

          <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
            <Panel>
              <div style={{ ...ui.micro, fontSize: 9, marginBottom: 10 }}>Quiz · question 2/5</div>
              <div style={{ ...ui.body, fontSize: 13, marginBottom: 12 }}>
                Où doit voyager un jeton d&apos;accès ?
              </div>
              {[
                { t: "Dans l'URL", ok: false },
                { t: "Dans l'en-tête Authorization", ok: true },
                { t: "Dans un cookie non signé", ok: false },
              ].map((o) => (
                <div
                  key={o.t}
                  style={{
                    ...ui.body,
                    fontSize: 12.5,
                    padding: "9px 11px",
                    marginBottom: 7,
                    border: `1px solid ${o.ok ? palette.brandTurquoise : palette.borderDefault}`,
                    color: o.ok ? palette.brandTurquoise : palette.textSecondary,
                  }}
                >
                  {o.t}
                </div>
              ))}
            </Panel>
            <Panel accent={palette.brandBlue}>
              <div style={{ ...ui.micro, fontSize: 9 }}>Récompense</div>
              <div
                style={{
                  color: palette.textPrimary,
                  fontFamily: fonts.sans,
                  fontSize: 19,
                  fontWeight: 800,
                  marginTop: 7,
                }}
              >
                + 150 XP
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherScreen(): React.JSX.Element {
  const rows: { name: string; done: string; pct: number; late: boolean }[] = [
    { name: "Amélie Durand", done: "6 / 6", pct: 100, late: false },
    { name: "Sacha Martin", done: "5 / 6", pct: 83, late: false },
    { name: "Ines Ba", done: "4 / 6", pct: 66, late: false },
    { name: "Théo Roy", done: "2 / 6", pct: 33, late: true },
    { name: "Lina Mercier", done: "1 / 6", pct: 16, late: true },
  ];

  return (
    <div style={{ height: "100%", backgroundColor: palette.bgBase }}>
      <TopBar />
      <div style={{ padding: "26px 30px" }}>
        <Section
          eyebrow="Ma classe · professeur"
          title="SIO1-A · Cybersécurité"
          cta="Donner du travail →"
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {[
              { n: "28", l: "élèves" },
              { n: "6", l: "travaux donnés" },
              { n: "2", l: "en retard" },
            ].map((s) => (
              <Panel key={s.l} {...(s.l === "en retard" ? { accent: palette.danger } : {})}>
                <div
                  style={{
                    color: s.l === "en retard" ? palette.danger : palette.brandTurquoise,
                    fontFamily: fonts.sans,
                    fontSize: 30,
                    fontWeight: 800,
                  }}
                >
                  {s.n}
                </div>
                <div style={{ ...ui.micro, fontSize: 9, marginTop: 5 }}>{s.l}</div>
              </Panel>
            ))}
          </div>
        </Section>

        <div style={{ ...ui.eyebrow, marginBottom: 12 }}>Avancement · Sécuriser une API REST</div>
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div
              key={r.name}
              style={{
                display: "grid",
                gridTemplateColumns: "180px 1fr 70px",
                alignItems: "center",
                gap: 16,
                padding: "11px 16px",
                border: `1px solid ${palette.borderDefault}`,
                backgroundColor: palette.bgElevated,
              }}
            >
              <div style={{ ...ui.body, fontSize: 13, color: palette.textPrimary }}>{r.name}</div>
              <Bar value={r.pct} />
              <div
                style={{
                  ...ui.micro,
                  fontSize: 9.5,
                  textAlign: "right",
                  color: r.late ? palette.danger : palette.textMuted,
                }}
              >
                {r.done}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WebScreen({ screen }: { screen: WebScreenName }): React.JSX.Element {
  switch (screen) {
    case "dashboard":
      return <DashboardScreen />;
    case "lesson":
      return <LessonScreen />;
    case "teacher":
      return <TeacherScreen />;
  }
}

/** A browser window around a screen, the way PhoneMock frames the app. */
export function BrowserMock({
  screen,
  style,
}: {
  screen: WebScreenName;
  style?: React.CSSProperties;
}): React.JSX.Element {
  return (
    <div
      style={{
        width: 1180,
        height: 596,
        border: `1px solid ${palette.borderDefault}`,
        backgroundColor: palette.bgBase,
        boxShadow: `0 40px 100px ${palette.blueSoft}`,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 38,
          padding: "0 14px",
          borderBottom: `1px solid ${palette.borderDefault}`,
          backgroundColor: palette.bgElevated,
        }}
      >
        {[palette.danger, palette.warning, palette.brandTurquoise].map((c) => (
          <div key={c} style={{ width: 9, height: 9, borderRadius: 9, backgroundColor: c }} />
        ))}
        <div
          style={{
            marginLeft: 10,
            padding: "4px 14px",
            border: `1px solid ${palette.borderDefault}`,
            color: palette.textMuted,
            fontFamily: fonts.mono,
            fontSize: 11,
          }}
        >
          cyberlearn.fr
        </div>
      </div>
      <div style={{ height: "calc(100% - 38px)" }}>
        <WebScreen screen={screen} />
      </div>
    </div>
  );
}
