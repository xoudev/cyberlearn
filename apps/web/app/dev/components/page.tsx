import React from "react";
import {
  XPBar,
  LevelBadge,
  RarityBadge,
  LessonCard,
  PathProgress,
  NotificationBell,
} from "@cyberlearn/ui";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

function Section({
  title,
  description,
  children,
  grid,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  grid?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
            {description}
          </p>
        )}
      </div>
      <div
        className={
          grid
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            : "flex flex-wrap items-center gap-3"
        }
      >
        {children}
      </div>
    </section>
  );
}

function DemoCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full flex flex-wrap items-center gap-4 rounded-xl p-5"
      style={{
        backgroundColor: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

export default function DevComponentsPage(): React.JSX.Element {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-base)" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between border-b px-8 py-4"
        style={{
          backgroundColor: "var(--color-bg-base)",
          borderColor: "var(--color-border-subtle)",
        }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Component Showcase
          </h1>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Dev only · bloqué en production
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-8 py-10">
        {/* ── Brand components ─────────────────────────────────────── */}

        <div className="space-y-2">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand-turquoise)" }}
          >
            Brand components — @cyberlearn/ui
          </p>
          <Separator />
        </div>

        <Section title="LevelBadge" description="3 tailles, pill avec préfixe NV.">
          <DemoCard>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <LevelBadge level={7} size="sm" />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  sm
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LevelBadge level={12} size="md" />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  md
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LevelBadge level={99} size="lg" />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  lg
                </span>
              </div>
            </div>
            <div
              className="flex items-center gap-3 pl-4 border-l"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Jordan
              </span>
              <LevelBadge level={23} size="md" />
            </div>
          </DemoCard>
        </Section>

        <Section title="XPBar" description="Barre de progression XP avec valeurs optionnelles">
          <DemoCard>
            <div className="w-full max-w-sm space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <LevelBadge level={5} size="sm" />
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    320 / 500 XP
                  </span>
                </div>
                <XPBar currentXP={320} xpForNextLevel={500} level={5} />
              </div>
              <XPBar currentXP={320} xpForNextLevel={500} level={5} showValues />
              <XPBar currentXP={500} xpForNextLevel={500} level={6} showValues />
            </div>
          </DemoCard>
        </Section>

        <Section title="RarityBadge" description="Raretés alignées sur l'enum Prisma BadgeRarity">
          <DemoCard>
            <RarityBadge rarity="COMMON" />
            <RarityBadge rarity="RARE" />
            <RarityBadge rarity="EPIC" />
            <RarityBadge rarity="LEGENDARY" />
            <RarityBadge rarity="LEGENDARY" showDot={false} />
          </DemoCard>
        </Section>

        <Section title="LessonCard" description="États NOT_STARTED / IN_PROGRESS / COMPLETED" grid>
          <LessonCard
            title="Introduction au phishing"
            slug="intro-phishing"
            difficulty="BEGINNER"
            xpReward={50}
            durationMinutes={15}
            status="NOT_STARTED"
            category="Phishing"
          />
          <LessonCard
            title="Mots de passe robustes"
            slug="mots-de-passe-robustes"
            difficulty="INTERMEDIATE"
            xpReward={75}
            durationMinutes={20}
            status="IN_PROGRESS"
            category="Authentification"
          />
          <LessonCard
            title="Chiffrement asymétrique"
            slug="chiffrement-asymetrique"
            difficulty="ADVANCED"
            xpReward={120}
            durationMinutes={40}
            status="COMPLETED"
            category="Cryptographie"
          />
        </Section>

        <Section title="PathProgress" description="Variantes bar et compact">
          <DemoCard>
            <div className="w-full max-w-sm space-y-4">
              <PathProgress
                pathName="Sécurité des mots de passe"
                completedLessons={3}
                totalLessons={8}
              />
              <PathProgress
                pathName="Phishing & Ingénierie sociale"
                completedLessons={8}
                totalLessons={8}
              />
              <Separator />
              <PathProgress
                pathName="Réseau & Systèmes"
                completedLessons={1}
                totalLessons={12}
                variant="compact"
              />
              <PathProgress
                pathName="Cryptographie avancée"
                completedLessons={6}
                totalLessons={6}
                variant="compact"
              />
            </div>
          </DemoCard>
        </Section>

        <Section title="NotificationBell" description="Avec badge de comptage (99+ cap)">
          <DemoCard>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <NotificationBell unreadCount={0} />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  0
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <NotificationBell unreadCount={3} />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  3
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <NotificationBell unreadCount={12} />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  12
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <NotificationBell unreadCount={100} />
                <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  99+
                </span>
              </div>
            </div>
          </DemoCard>
        </Section>

        {/* ── shadcn/ui ─────────────────────────────────────────────── */}

        <div className="space-y-2 pt-4">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand-blue)" }}
          >
            shadcn/ui — primitives
          </p>
          <Separator />
        </div>

        <Section title="Button" description="Variantes shadcn + état disabled">
          <DemoCard>
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </DemoCard>
        </Section>

        <Section title="Badge">
          <DemoCard>
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </DemoCard>
        </Section>

        <Section title="Avatar">
          <DemoCard>
            <Avatar>
              <AvatarImage
                src="https://avatars.githubusercontent.com/u/1?v=4"
                alt="GitHub user 1"
              />
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-base">CL</AvatarFallback>
            </Avatar>
          </DemoCard>
        </Section>

        <Section title="Input">
          <DemoCard>
            {/* suppressHydrationWarning: ProtonPass extension injects data-protonpass-form */}
            <div className="w-full max-w-xs space-y-3" suppressHydrationWarning>
              <Input placeholder="Email ou nom d'utilisateur" />
              <Input type="password" placeholder="Mot de passe" />
              <Input disabled placeholder="Désactivé" />
            </div>
          </DemoCard>
        </Section>

        <Section title="Progress" description="shadcn Progress (non XPBar)">
          <DemoCard>
            <div className="w-full max-w-sm space-y-3">
              <Progress value={0} />
              <Progress value={33} />
              <Progress value={66} />
              <Progress value={100} />
            </div>
          </DemoCard>
        </Section>

        <Section title="Card">
          <DemoCard>
            <Card className="w-72">
              <CardHeader>
                <CardTitle>Exemple de carte</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Contenu de la carte avec du texte secondaire.
                </p>
              </CardContent>
            </Card>
          </DemoCard>
        </Section>

        <Section title="Skeleton">
          <DemoCard>
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-8 w-24" />
            </div>
          </DemoCard>
        </Section>
      </div>
    </div>
  );
}
