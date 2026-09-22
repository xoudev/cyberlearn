import React from "react";
import { Img, staticFile } from "remotion";
import { fonts, palette } from "../theme";

export type ScreenName = "home" | "paths" | "lesson" | "profile" | "locker" | "class";

const ui = {
  body: {
    color: palette.textSecondary,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 1.45,
  },
  micro: {
    color: palette.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: 500,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  title: {
    color: palette.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 18,
    fontWeight: 800,
  },
} as const;

function StatusBar(): React.JSX.Element {
  return (
    <div
      style={{
        height: 34,
        padding: "11px 18px 0",
        display: "flex",
        justifyContent: "space-between",
        color: palette.textSecondary,
        fontFamily: fonts.mono,
        fontSize: 9,
      }}
    >
      <span>9:41</span>
      <span style={{ letterSpacing: 3 }}>● ◐</span>
    </div>
  );
}

function BottomNav({
  active,
}: { active: "home" | "paths" | "lessons" | "profile" }): React.JSX.Element {
  const items: Array<{ key: typeof active; icon: string; label: string }> = [
    { key: "home", icon: "⌂", label: "Accueil" },
    { key: "paths", icon: "⌁", label: "Parcours" },
    { key: "lessons", icon: "▣", label: "Leçons" },
    { key: "profile", icon: "♙", label: "Profil" },
  ];
  return (
    <div
      style={{
        height: 66,
        borderTop: `1px solid ${palette.borderSubtle}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: "rgba(3,2,25,0.98)",
      }}
    >
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <div key={item.key} style={{ width: 72, textAlign: "center" }}>
            <div
              style={{ color: selected ? palette.brandTurquoise : palette.textMuted, fontSize: 20 }}
            >
              {item.icon}
            </div>
            <div
              style={{
                ...ui.micro,
                color: selected ? palette.brandTurquoise : palette.textMuted,
                fontSize: 7,
                letterSpacing: 0.7,
                marginTop: 2,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Shell({
  children,
  active,
}: {
  children: React.ReactNode;
  active: "home" | "paths" | "lessons" | "profile";
}): React.JSX.Element {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, padding: "18px 18px 12px", overflow: "hidden" }}>{children}</div>
      <BottomNav active={active} />
    </div>
  );
}

function Card({
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
        padding: 15,
        border: `1px solid ${palette.borderDefault}`,
        borderLeft: `${accent ? 3 : 1}px solid ${accent ?? palette.borderDefault}`,
        backgroundColor: palette.bgElevated,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Progress({ value }: { value: number }): React.JSX.Element {
  return (
    <div
      style={{
        height: 6,
        border: `1px solid ${palette.borderDefault}`,
        backgroundColor: palette.bgBase,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${palette.brandBlue}, ${palette.brandTurquoise})`,
        }}
      />
    </div>
  );
}

function Pill({
  label,
  color = palette.brandTurquoise,
  active = false,
}: { label: string; color?: string; active?: boolean }): React.JSX.Element {
  return (
    <div
      style={{
        ...ui.micro,
        color: active ? palette.bgBase : color,
        padding: "7px 9px",
        border: `1px solid ${color}`,
        backgroundColor: active ? color : "transparent",
        fontSize: 7.5,
        letterSpacing: 0.7,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  right,
}: { eyebrow?: string; title: string; right?: string }): React.JSX.Element {
  return (
    <div style={{ margin: "16px 0 10px" }}>
      {eyebrow ? (
        <div style={{ ...ui.micro, color: palette.brandTurquoise, marginBottom: 5 }}>
          // {eyebrow}
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={ui.title}>{title}</div>
        {right ? <div style={{ ...ui.micro, fontSize: 8 }}>{right}</div> : null}
      </div>
    </div>
  );
}

function LogoMark({ size = 36 }: { size?: number }): React.JSX.Element {
  return <Img src={staticFile("logo.png")} style={{ width: size, height: size }} />;
}

function HomeScreen(): React.JSX.Element {
  return (
    <Shell active="home">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LogoMark />
          <div>
            <div style={{ ...ui.micro, color: palette.brandTurquoise }}>Bon retour</div>
            <div style={{ ...ui.title, fontSize: 16, marginTop: 2 }}>@apprenti</div>
          </div>
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            border: `1px solid ${palette.borderSubtle}`,
            display: "grid",
            placeItems: "center",
            color: palette.textMuted,
          }}
        >
          ♢
        </div>
      </div>

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ ...ui.title, fontSize: 15 }}>Niveau 7</div>
          <div style={{ ...ui.micro, fontSize: 7.5 }}>1 840 / 2 000 XP</div>
        </div>
        <Progress value={76} />
        <div style={{ ...ui.micro, marginTop: 12 }}>◆ Palier argent</div>
      </Card>

      <SectionTitle eyebrow="Progression" title="Ta série" right="Record 18 jours" />
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ color: palette.warning, fontSize: 30 }}>◆</div>
          <div>
            <div style={{ color: palette.warning, fontSize: 27, fontWeight: 800 }}>12</div>
            <div style={{ ...ui.micro, fontSize: 7.5 }}>jours de série</div>
          </div>
        </div>
        <div style={{ ...ui.body, color: palette.textMuted, fontSize: 11, textAlign: "right" }}>
          Continue
          <br />
          aujourd’hui
        </div>
      </Card>

      <SectionTitle title="Reprends où tu t’es arrêté" />
      <Card accent={palette.brandTurquoise}>
        <div style={{ ...ui.micro, color: palette.brandTurquoise }}>Cybersécurité</div>
        <div style={{ ...ui.title, fontSize: 15, margin: "6px 0 8px" }}>Sécuriser une API</div>
        <div style={{ ...ui.micro, color: palette.brandTurquoise, fontSize: 7.5 }}>Continuer →</div>
      </Card>

      <SectionTitle eyebrow="Cette semaine" title="Quêtes hebdo" right="2 en cours" />
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ ...ui.body, color: palette.textPrimary, fontWeight: 600 }}>
            Terminer 3 leçons
          </span>
          <span style={{ ...ui.micro, color: palette.warning }}>2/3 · +150 XP</span>
        </div>
        <Progress value={66} />
      </Card>
    </Shell>
  );
}

const pathCards = [
  {
    category: "Cybersécurité",
    color: palette.category.CYBERSEC,
    title: "Défense Web",
    text: "Comprendre les failles et protéger une application.",
    missions: "8 missions",
  },
  {
    category: "Développement",
    color: palette.category.DEV,
    title: "JavaScript moderne",
    text: "De la syntaxe aux applications robustes.",
    missions: "10 missions",
  },
  {
    category: "Réseau",
    color: palette.category.NETWORK,
    title: "Réseaux essentiels",
    text: "Maîtriser TCP/IP, DNS et le routage.",
    missions: "7 missions",
  },
];

function PathsScreen(): React.JSX.Element {
  return (
    <Shell active="paths">
      <SectionTitle eyebrow="Cyber Learn" title="Catalogue Parcours" right="12 parcours" />
      <div
        style={{
          border: `1px solid ${palette.borderDefault}`,
          padding: "13px 14px",
          ...ui.body,
          color: palette.textDisabled,
        }}
      >
        Rechercher un parcours…
      </div>
      <div style={{ display: "flex", gap: 7, margin: "12px 0 15px" }}>
        <Pill label="Tous" active />
        <Pill label="Cyber" color={palette.category.CYBERSEC} />
        <Pill label="Dev" color={palette.category.DEV} />
        <Pill label="Réseau" color={palette.category.NETWORK} />
      </div>
      <div style={{ display: "grid", gap: 11 }}>
        {pathCards.map((path, index) => (
          <Card key={path.title} accent={path.color}>
            <div style={{ ...ui.micro, color: path.color }}>
              {path.category} · {index === 0 ? "Intermédiaire" : "Débutant"}
            </div>
            <div style={{ ...ui.title, fontSize: 15, margin: "7px 0 5px" }}>{path.title}</div>
            <div style={{ ...ui.body, color: palette.textMuted, fontSize: 11.5 }}>{path.text}</div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 11,
              }}
            >
              <span style={{ ...ui.micro, fontSize: 7.5 }}>{path.missions}</span>
              <Pill label={index === 0 ? "Reprendre" : "Commencer"} active={index === 0} />
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}

function LessonScreen(): React.JSX.Element {
  return (
    <Shell active="lessons">
      <div style={{ ...ui.micro, color: palette.brandTurquoise }}>← Catalogue</div>
      <div style={{ ...ui.micro, color: palette.category.CYBERSEC, marginTop: 22 }}>
        Cybersécurité · Intermédiaire
      </div>
      <div style={{ ...ui.title, fontSize: 28, lineHeight: 1.12, marginTop: 8 }}>
        Sécuriser
        <br />
        une API
      </div>
      <div style={{ ...ui.body, color: palette.textMuted, marginTop: 10 }}>
        Comprendre l’authentification, les permissions et les limites de requêtes.
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Pill label="12 min" />
        <Pill label="+120 XP" color={palette.warning} />
      </div>

      <SectionTitle eyebrow="Chapitre 02" title="Valider chaque requête" />
      <div style={{ ...ui.body, lineHeight: 1.55 }}>
        Une API sûre ne fait jamais confiance aux données reçues. Chaque entrée doit être validée
        avant d’atteindre la logique métier.
      </div>

      <div
        style={{
          borderLeft: `3px solid ${palette.brandTurquoise}`,
          backgroundColor: palette.accentSoft,
          padding: 13,
          marginTop: 15,
        }}
      >
        <div style={{ ...ui.micro, color: palette.brandTurquoise }}>Bonne pratique</div>
        <div style={{ ...ui.body, color: palette.textPrimary, marginTop: 5 }}>
          Valide le format, la taille et les permissions côté serveur.
        </div>
      </div>

      <div
        style={{
          border: `1px solid ${palette.borderDefault}`,
          backgroundColor: palette.bgElevated,
          marginTop: 15,
        }}
      >
        <div
          style={{
            padding: "9px 12px",
            borderBottom: `1px solid ${palette.borderSubtle}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ ...ui.micro, color: palette.brandTurquoise }}>TypeScript</span>
          <span style={{ ...ui.micro, fontSize: 7 }}>Sandbox</span>
        </div>
        <pre
          style={{
            margin: 0,
            padding: 13,
            color: palette.textSecondary,
            fontFamily: fonts.mono,
            fontSize: 10.5,
            lineHeight: 1.65,
          }}
        >
          {`const input = schema.safeParse(body);

if (!input.success) {
  return Response.json(
    { error: "INVALID_INPUT" },
    { status: 400 }
  );
}`}
        </pre>
      </div>
    </Shell>
  );
}

function ProfileScreen(): React.JSX.Element {
  const stats = [
    ["7", "Niveau"],
    ["14", "Badges"],
    ["32", "Leçons"],
    ["2", "Certifs"],
  ];
  return (
    <Shell active="profile">
      <div style={{ display: "grid", placeItems: "center", marginTop: 8 }}>
        <div
          style={{
            width: 92,
            height: 92,
            border: `2px solid ${palette.brandTurquoise}`,
            backgroundColor: palette.accentSoft,
            display: "grid",
            placeItems: "center",
          }}
        >
          <LogoMark size={66} />
        </div>
        <div style={{ ...ui.title, fontSize: 22, marginTop: 12 }}>@apprenti</div>
        <div style={{ marginTop: 9 }}>
          <Pill label="◆ Palier argent" />
        </div>
      </div>

      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ ...ui.title, fontSize: 14 }}>Niveau 7</span>
          <span style={{ ...ui.micro, fontSize: 7.5 }}>1 840 / 2 000 XP</span>
        </div>
        <Progress value={76} />
      </Card>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}
      >
        {stats.map(([value, label], index) => (
          <div
            key={label}
            style={{
              border: `1px solid ${palette.borderSubtle}`,
              padding: "12px 4px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                ...ui.title,
                color: index === 0 ? palette.brandTurquoise : palette.textPrimary,
                fontSize: 20,
              }}
            >
              {value}
            </div>
            <div style={{ ...ui.micro, fontSize: 6.5, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <SectionTitle eyebrow="Trophées" title="Badges récents" />
      {["Premier pas", "Série de 7 jours", "API défendue"].map((label, index) => (
        <Card
          key={label}
          accent={index === 2 ? palette.warning : palette.brandTurquoise}
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 9 }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              border: `1px solid ${index === 2 ? palette.warning : palette.brandTurquoise}`,
              display: "grid",
              placeItems: "center",
              color: index === 2 ? palette.warning : palette.brandTurquoise,
            }}
          >
            ◆
          </div>
          <div>
            <div style={{ ...ui.title, fontSize: 14 }}>{label}</div>
            <div
              style={{
                ...ui.micro,
                color: index === 2 ? palette.warning : palette.brandTurquoise,
                marginTop: 3,
              }}
            >
              {index === 2 ? "Rare" : "Commun"}
            </div>
          </div>
        </Card>
      ))}
    </Shell>
  );
}

function LockerScreen(): React.JSX.Element {
  const items = [
    {
      title: "Turquoise système",
      type: "Couleur d’accent",
      color: palette.brandTurquoise,
      active: true,
    },
    { title: "Bleu profond", type: "Couleur d’accent", color: palette.info, active: false },
    {
      title: "Midnight Ops",
      type: "Thème de terminal",
      color: palette.brandTurquoise,
      active: true,
    },
    { title: "Amber Mono", type: "Thème de terminal", color: palette.warning, active: false },
  ];
  return (
    <Shell active="profile">
      <div style={{ ...ui.micro, color: palette.brandTurquoise }}>← Profil</div>
      <SectionTitle eyebrow="Cosmétiques" title="Casier" right="8/14 débloqués" />
      <div style={{ ...ui.micro, color: palette.brandTurquoise, margin: "14px 0 9px" }}>
        Couleurs d’accent
      </div>
      {items.slice(0, 2).map((item) => (
        <LockerItem key={item.title} {...item} />
      ))}
      <div style={{ ...ui.micro, color: palette.brandTurquoise, margin: "18px 0 9px" }}>
        Thèmes de terminal
      </div>
      {items.slice(2).map((item) => (
        <LockerItem key={item.title} {...item} terminal />
      ))}
      <SectionTitle eyebrow="Équipé" title="Aperçu du profil" />
      <Card
        accent={palette.brandTurquoise}
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            border: `2px solid ${palette.brandTurquoise}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <LogoMark size={34} />
        </div>
        <div>
          <div style={{ ...ui.title, fontSize: 15 }}>@apprenti</div>
          <div style={{ ...ui.micro, color: palette.brandTurquoise, marginTop: 4 }}>
            Midnight Ops · actif
          </div>
        </div>
      </Card>
    </Shell>
  );
}

function LockerItem({
  title,
  type,
  color,
  active,
  terminal = false,
}: {
  title: string;
  type: string;
  color: string;
  active: boolean;
  terminal?: boolean;
}): React.JSX.Element {
  return (
    <Card
      {...(active ? { accent: color } : {})}
      style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 9 }}
    >
      <div
        style={{
          width: 72,
          height: 46,
          border: `1px solid ${color}`,
          backgroundColor: terminal ? palette.bgBase : `${color}16`,
          padding: terminal ? 8 : 0,
          display: "grid",
          alignContent: "center",
        }}
      >
        {terminal ? (
          <>
            <div style={{ ...ui.micro, color, fontSize: 6 }}>$ whoami</div>
            <div style={{ width: 34, height: 2, backgroundColor: color, marginTop: 5 }} />
          </>
        ) : (
          <div style={{ height: 7, backgroundColor: color }} />
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ ...ui.title, fontSize: 13.5 }}>{title}</div>
        <div style={{ ...ui.micro, fontSize: 7, marginTop: 4 }}>{type}</div>
      </div>
      <Pill label={active ? "Équipé" : "Équiper"} color={color} active={active} />
    </Card>
  );
}

/**
 * Ma classe, côté élève.
 *
 * The trailer had four beats and none of them said the product is used in
 * schools, which is the thing that decides who it is for. A teacher gives work
 * with a deadline, it lands here, and it says plainly what is late.
 *
 * Built from what the real screen shows (apps/mobile/app/my-class.tsx): the
 * class and its teacher, then the work sorted with the overdue first, each row
 * carrying its state. The wording is the app's own - "avant le", "échue le",
 * "Fait", "En retard" - because a trailer that invents its own words sells a
 * product that does not exist.
 */
function ClassScreen(): React.JSX.Element {
  const work: { title: string; meta: string; state: "late" | "todo" | "done" }[] = [
    { title: "Sécuriser une API REST", meta: "Leçon · échue le 18 sept.", state: "late" },
    { title: "Le modèle OSI, couche par couche", meta: "Leçon · avant le 26 sept.", state: "todo" },
    { title: "Parcours Réseau — 6 leçons", meta: "Parcours · avant le 3 oct.", state: "todo" },
    { title: "Les bases du chiffrement", meta: "Leçon · rendue le 12 sept.", state: "done" },
  ];

  return (
    <Shell active="home">
      <SectionTitle eyebrow="Ma classe" title="SIO1-A · Cyber" right="28 élèves" />
      <Card accent={palette.brandBlue}>
        <div style={{ ...ui.micro, color: palette.brandTurquoise }}>
          Lycée Jean-Moulin · 2025-2026
        </div>
        <div style={{ ...ui.body, color: palette.textMuted, fontSize: 11.5, marginTop: 7 }}>
          Claire Fontaine, Marc Olivier
        </div>
      </Card>

      <SectionTitle title="Travail donné" right="3 en cours" />
      <div style={{ display: "grid", gap: 9 }}>
        {work.map((item) => {
          const color =
            item.state === "late"
              ? palette.danger
              : item.state === "done"
                ? palette.brandTurquoise
                : palette.borderDefault;
          return (
            <Card key={item.title} accent={color}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    ...ui.title,
                    fontSize: 13.5,
                    opacity: item.state === "done" ? 0.55 : 1,
                  }}
                >
                  {item.title}
                </div>
                {item.state === "late" ? <Pill label="En retard" color={palette.danger} /> : null}
                {item.state === "done" ? (
                  <Pill label="Fait" color={palette.brandTurquoise} />
                ) : null}
              </div>
              <div style={{ ...ui.micro, fontSize: 7.5, marginTop: 7 }}>{item.meta}</div>
            </Card>
          );
        })}
      </div>
    </Shell>
  );
}

export function AppScreen({ screen }: { screen: ScreenName }): React.JSX.Element {
  switch (screen) {
    case "class":
      return <ClassScreen />;
    case "home":
      return <HomeScreen />;
    case "paths":
      return <PathsScreen />;
    case "lesson":
      return <LessonScreen />;
    case "profile":
      return <ProfileScreen />;
    case "locker":
      return <LockerScreen />;
  }
}
