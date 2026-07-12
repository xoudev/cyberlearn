import React, { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { HexAvatar } from "@/components/hex-avatar";
import { ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { Card, Divider, Pill, SectionLabel, StatCell, Text, XPBar } from "@/components/ui";
import { RARITY_COLOR } from "@/lib/db";
import { useProfile } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const SUB_TABS = ["Badges", "Certificats", "Stats", "Collection"] as const;
type Sub = (typeof SUB_TABS)[number];

const HUB_LINKS = [
  "Révisions",
  "Bloc-notes",
  "Classement",
  "Défis",
  "Casier",
  "Wrapped",
  "Réglages",
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
  const { session } = useSession();
  const { data, isLoading, error } = useProfile(session?.user.id);
  const [sub, setSub] = useState<Sub>("Badges");

  if (isLoading || !data) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {error ? (
            <Text variant="bodySm" style={{ color: colors.danger }}>
              Profil indisponible.
            </Text>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      </Screen>
    );
  }

  const { me, level, tier, completed, badges, certificates } = data;

  return (
    <Screen>
      {/* Identity */}
      <View style={{ alignItems: "center", gap: 10, marginBottom: 20 }}>
        <HexAvatar initials={initialsOf(me.displayName)} color={tier.tier.color} />
        <Text variant="h1">{me.username ? `@${me.username}` : me.displayName}</Text>
        <Pill label={`◆ Palier ${tier.tier.label}`} color={tier.tier.color} />
      </View>

      {/* XP */}
      <Card style={{ marginBottom: 18, gap: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="h3">Niveau {level.level}</Text>
          <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
            {level.current}/{level.needed} XP
          </Text>
        </View>
        <XPBar current={level.current} needed={level.needed} />
      </Card>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 22 }}>
        <StatCell value={level.level} label="Niveau" accent={colors.accent} />
        <StatCell value={badges.length} label="Badges" />
        <StatCell value={completed} label="Leçons" />
        <StatCell value={certificates.length} label="Certifs" />
      </View>

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
            {badges.map((b) => (
              <Card key={b.name} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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
            ))}
          </View>
        ) : (
          <Text variant="bodySm" style={{ textAlign: "center", marginVertical: 24 }}>
            Aucun badge débloqué pour l&apos;instant.
          </Text>
        )
      ) : sub === "Certificats" ? (
        certificates.length > 0 ? (
          <View style={{ gap: 10 }}>
            {certificates.map((c) => (
              <Card key={c.publicId} style={{ gap: 4 }}>
                <Text variant="h3">{c.pathTitle}</Text>
                <Text variant="mono" style={{ color: colors.textMuted, fontSize: 11 }}>
                  {c.score != null ? `Score ${c.score}% · ` : ""}
                  {fmtDate(c.issuedAt)}
                </Text>
              </Card>
            ))}
          </View>
        ) : (
          <Text variant="bodySm" style={{ textAlign: "center", marginVertical: 24 }}>
            Aucun certificat obtenu.
          </Text>
        )
      ) : (
        <Card style={{ gap: 8 }}>
          <Text variant="body">Leçons complétées : {completed}</Text>
          <Text variant="body">Série record : {me.longestStreak} j</Text>
          <Text variant="body">XP total : {String(me.xpTotal)}</Text>
        </Card>
      )}

      {/* Hub to secondary sections (wired in a later phase) */}
      <View style={{ marginTop: 26 }}>
        <SectionLabel title="Explorer" />
        <Card style={{ padding: 0 }}>
          {HUB_LINKS.map((label, i) => (
            <View key={label}>
              {i > 0 ? <Divider /> : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                }}
              >
                <Text variant="h3">{label}</Text>
                <ChevronRight color={colors.textMuted} size={16} />
              </View>
            </View>
          ))}
        </Card>
      </View>

      {/* Sign out */}
      <Pressable
        onPress={() => void supabase.auth.signOut()}
        style={{
          marginTop: 22,
          height: 46,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text variant="micro" style={{ color: colors.danger }}>
          Se déconnecter
        </Text>
      </Pressable>
    </Screen>
  );
}
