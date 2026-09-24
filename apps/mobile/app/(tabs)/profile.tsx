import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { AnimatedXPBar, PressableScale, Rise } from "@/components/anim";
import { ChevronRight } from "@/components/icons";
import { Avatar, BadgeIcon } from "@/components/media";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { useTourAnchor } from "@/components/tour";
import { Card, Divider, Pill, SectionLabel, StatCell, Text } from "@/components/ui";
import { fetchMyAvatarUrl } from "@/lib/api";
import { RARITY_COLOR } from "@/lib/db";
import { useProfile } from "@/lib/queries";
import { useSession } from "@/lib/session";

const SUB_TABS = ["Badges", "Certificats", "Stats", "Collection"] as const;
type Sub = (typeof SUB_TABS)[number];

// In-app screens first, then sections that still live on the web.
const HUB_LINKS: { label: string; route?: string; url?: string }[] = [
  // Ma classe leads: it is the only entry here that can carry a deadline, and
  // the site now e-mails people about those.
  { label: "Ma classe", route: "/my-class" },
  { label: "Classement", route: "/leaderboard" },
  { label: "Bloc-notes", route: "/notes" },
  { label: "Casier", route: "/locker" },
  { label: "Révisions", route: "/revisions" },
  { label: "Forum", route: "/forum" },
  { label: "Notifications", route: "/notifications" },
  { label: "Réglages", route: "/settings" },
  // Still on the web. Each of these is listed in docs/MOBILE_PARITY.md with
  // whether it is owed or deliberately web-only, so the gap is a decision on
  // record rather than something that looks forgotten.
  { label: "Aide & demandes", url: "https://cyberlearn.fr/support" },
  { label: "Défis", url: "https://cyberlearn.fr/challenges" },
  { label: "Amis", url: "https://cyberlearn.fr/friends" },
  { label: "Ma modération", url: "https://cyberlearn.fr/settings/moderation" },
  { label: "Wrapped", url: "https://cyberlearn.fr/wrapped" },
];

/** The stored form that needs the server to turn it into something drawable. */
const UPLOAD_PREFIX = "__upload:";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function Profil(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useProfile(session?.user.id);
  const [sub, setSub] = useState<Sub>("Badges");
  // An uploaded avatar lives in a private bucket, so the row the app read
  // itself holds a marker rather than a URL and only the server can sign it.
  // Everything else - a glyph, a preset, nothing at all - Avatar draws from
  // the marker directly, so this call is skipped.
  const stored = data?.me.avatarUrl ?? null;
  const needsSigning = stored?.startsWith(UPLOAD_PREFIX) === true;
  const [signedAvatar, setSignedAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (!needsSigning) {
      setSignedAvatar(null);
      return;
    }
    let live = true;
    void fetchMyAvatarUrl()
      .then((url) => {
        if (live) setSignedAvatar(url);
      })
      // Nothing to say: Avatar falls back to initials, which is what it did
      // before this call existed.
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [needsSigning, stored]);
  const idAnchor = useTourAnchor("profil-id");

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
    <Screen onRefresh={() => refetch()}>
      {/* Identity */}
      <View
        ref={idAnchor}
        collapsable={false}
        style={{ alignItems: "center", gap: 10, marginBottom: 20 }}
      >
        <Avatar
          avatarUrl={needsSigning ? signedAvatar : me.avatarUrl}
          displayName={me.displayName}
          size={104}
          color={tier.tier.color}
        />
        <Text variant="h1">{me.username ? `@${me.username}` : me.displayName}</Text>
        <Pill label={`◆ Palier ${tier.tier.label}`} color={tier.tier.color} />
      </View>

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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {SUB_TABS.map((s) => (
          <PressableScale
            key={s}
            onPress={() => setSub(s)}
            style={{ flexGrow: 1, flexBasis: "47%", minWidth: 132 }}
          >
            <View
              style={{
                borderWidth: 1,
                borderColor: sub === s ? colors.accent : colors.borderDefault,
                backgroundColor: sub === s ? colors.accent : "transparent",
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                variant="micro"
                style={{ color: sub === s ? colors.bgBase : colors.textSecondary }}
              >
                {s}
              </Text>
            </View>
          </PressableScale>
        ))}
      </View>

      {/* Sub-tab content */}
      {sub === "Badges" || sub === "Collection" ? (
        badges.length > 0 ? (
          <View style={{ gap: 10 }}>
            {badges.map((b) => (
              <Card key={b.name} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <BadgeIcon iconUrl={b.iconUrl} color={RARITY_COLOR[b.rarity]} size={40} />
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
                    pathname: "/certificates/[publicId]",
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
              <PressableScale
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
              </PressableScale>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}
