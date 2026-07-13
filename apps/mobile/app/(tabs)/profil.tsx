import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { AnimatedXPBar, PopIn, PressableScale, Rise } from "@/components/anim";
import { HexAvatar } from "@/components/hex-avatar";
import { ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Divider, Pill, SectionLabel, StatCell, Text } from "@/components/ui";
import { RARITY_COLOR } from "@/lib/db";
import { useProfile } from "@/lib/queries";
import { useSession } from "@/lib/session";

const SUB_TABS = ["Badges", "Certificats", "Stats", "Collection"] as const;
type Sub = (typeof SUB_TABS)[number];

// In-app screens first, then sections that still live on the web.
const HUB_LINKS: { label: string; route?: string; url?: string }[] = [
  { label: "Classement", route: "/classement" },
  { label: "Notifications", route: "/notifications" },
  { label: "Réglages", route: "/reglages" },
  { label: "Révisions", url: "https://www.cyberlearn.fr/revisions" },
  { label: "Bloc-notes", url: "https://www.cyberlearn.fr/notes" },
  { label: "Défis", url: "https://www.cyberlearn.fr/challenges" },
  { label: "Casier", url: "https://www.cyberlearn.fr/casier" },
  { label: "Wrapped", url: "https://www.cyberlearn.fr/wrapped" },
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function Profil(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useProfile(session?.user.id);
  const [sub, setSub] = useState<Sub>("Badges");

  if (isLoading || !data) {
    return (
      <Screen>
        {error ? (
          <ErrorState onRetry={() => void refetch()} code="PROFILE_LOAD" />
        ) : (
          <ListSkeleton rows={4} />
        )}
      </Screen>
    );
  }

  const { me, level, tier, completed, badges, certificates } = data;

  return (
    <Screen>
      {/* Identity */}
      <Rise index={0}>
        <View style={{ alignItems: "center", gap: 10, marginBottom: 20 }}>
          <PopIn>
            <HexAvatar initials={initialsOf(me.displayName)} color={tier.tier.color} />
          </PopIn>
          <Text variant="h1">{me.username ? `@${me.username}` : me.displayName}</Text>
          <Pill label={`◆ Palier ${tier.tier.label}`} color={tier.tier.color} />
        </View>
      </Rise>

      {/* XP */}
      <Rise index={1}>
        <Card style={{ marginBottom: 18, gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text variant="h3">Niveau {level.level}</Text>
            <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
              {level.current}/{level.needed} XP
            </Text>
          </View>
          <AnimatedXPBar current={level.current} needed={level.needed} />
        </Card>
      </Rise>

      {/* Stats grid */}
      <Rise index={2}>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 22 }}>
          <StatCell value={level.level} label="Niveau" accent={colors.accent} />
          <StatCell value={badges.length} label="Badges" />
          <StatCell value={completed} label="Leçons" />
          <StatCell value={certificates.length} label="Certifs" />
        </View>
      </Rise>

      {/* Sub-tabs */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
        {SUB_TABS.map((s) => (
          <Pressable key={s} onPress={() => setSub(s)} style={{ flex: 1 }}>
            <View
              style={{
                borderWidth: 1,
                borderColor: sub === s ? colors.accent : colors.borderDefault,
                backgroundColor: sub === s ? colors.accent : "transparent",
                paddingVertical: 8,
                alignItems: "center",
              }}
            >
              <Text
                variant="micro"
                style={{ color: sub === s ? colors.bgBase : colors.textSecondary }}
              >
                {s}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Sub-tab content */}
      {sub === "Badges" || sub === "Collection" ? (
        badges.length > 0 ? (
          <View style={{ gap: 10 }}>
            {badges.map((b, i) => (
              <PopIn key={b.name} delay={i * 60}>
                <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: `${RARITY_COLOR[b.rarity]}22`,
                      borderWidth: 1,
                      borderColor: RARITY_COLOR[b.rarity],
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="h3">{b.name}</Text>
                    <Text variant="micro" style={{ color: RARITY_COLOR[b.rarity] }}>
                      {b.rarity}
                    </Text>
                  </View>
                </Card>
              </PopIn>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Aucun badge"
            body="Termine des leçons et des parcours pour débloquer tes premiers badges."
          />
        )
      ) : sub === "Certificats" ? (
        certificates.length > 0 ? (
          <View style={{ gap: 10 }}>
            {certificates.map((c) => (
              <PressableScale
                key={c.publicId}
                onPress={() =>
                  router.push({
                    pathname: "/certificats/[publicId]",
                    params: {
                      publicId: c.publicId,
                      title: c.pathTitle,
                      ...(c.score != null ? { score: String(c.score) } : {}),
                      date: fmtDate(c.issuedAt),
                    },
                  })
                }
              >
                <Card
                  accent={colors.info}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="h3">{c.pathTitle}</Text>
                    <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
                      {c.score != null ? `Score ${c.score}% · ` : ""}
                      {fmtDate(c.issuedAt)}
                    </Text>
                  </View>
                  <ChevronRight color={colors.textMuted} size={15} />
                </Card>
              </PressableScale>
            ))}
          </View>
        ) : (
          <EmptyState
            title="Aucun certificat"
            body="Termine un parcours et réussis son examen final pour décrocher un certificat."
          />
        )
      ) : (
        <Card style={{ gap: 8 }}>
          <Text variant="body">Leçons complétées : {completed}</Text>
          <Text variant="body">Série record : {me.longestStreak} j</Text>
          <Text variant="body">XP total : {String(me.xpTotal)}</Text>
        </Card>
      )}

      {/* Hub */}
      <View style={{ marginTop: 26 }}>
        <SectionLabel title="Explorer" />
        <Card style={{ padding: 0 }}>
          {HUB_LINKS.map((link, i) => (
            <View key={link.label}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => {
                  if (link.route) {
                    // SAFETY: typed routes are disabled; expo-router accepts any
                    // registered pathname string at runtime.
                    router.push(link.route as never);
                  } else if (link.url) {
                    void WebBrowser.openBrowserAsync(link.url);
                  }
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <Text variant="h3">{link.label}</Text>
                {link.url ? (
                  <Text variant="micro" style={{ color: colors.textMuted }}>
                    web ↗
                  </Text>
                ) : (
                  <ChevronRight color={colors.accent} size={16} />
                )}
              </Pressable>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
