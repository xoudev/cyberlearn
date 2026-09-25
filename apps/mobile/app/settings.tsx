import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale, Rise } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { useTour } from "@/components/tour";
import { Card, Divider, SectionLabel, Text } from "@/components/ui";
import {
  deviceNotificationsSupported,
  isDeviceNotificationsEnabled,
  setDeviceNotificationsEnabled,
} from "@/lib/device-notifications";
import {
  DEFAULT_PREFS,
  updateLeaderboardVisibility,
  updatePreference,
  usePreferences,
  useProfile,
  type LeaderboardVisibility,
  type PreferenceSwitch,
  type Preferences,
} from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const PREF_ROWS: { key: PreferenceSwitch; label: string; hint: string }[] = [
  { key: "emailNotifications", label: "E-mails", hint: "Notifications par e-mail" },
  {
    key: "spacedRepetition",
    label: "Révisions",
    hint: "Les leçons terminées reviennent au bon moment pour être retenues",
  },
  { key: "reviewReminders", label: "Rappels de révision", hint: "Quand une révision SM-2 est due" },
  { key: "weeklyDigest", label: "Digest hebdo", hint: "Résumé de ta semaine" },
  { key: "streakReminder", label: "Rappel de série", hint: "Avant de perdre ta série" },
];

// The site's privacy settings (/settings/privacy), word for word.
const VISIBILITY_OPTIONS: {
  id: LeaderboardVisibility;
  name: string;
  desc: string;
  recommended?: boolean;
}[] = [
  { id: "HIDDEN", name: "Masqué", desc: "Tu n'apparais pas dans le classement public." },
  {
    id: "ANONYMOUS",
    name: "Anonyme",
    desc: "Tu apparais comme « Anonyme », sans ton pseudo ni ton avatar.",
    recommended: true,
  },
  { id: "PUBLIC", name: "Public", desc: "Ton pseudo et ton avatar sont visibles par tous." },
];

const PRIVACY_ROWS: { key: PreferenceSwitch; label: string; hint: string }[] = [
  {
    key: "friendsLeaderboard",
    label: "Visible par mes amis",
    hint: "Apparaître, sous ton nom, dans le classement de tes amis.",
  },
  {
    key: "publicProfile",
    label: "Profil public",
    hint: "Rendre ta page profil accessible par lien. Tes amis y ont accès dans tous les cas.",
  },
];

export default function Reglages(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(userId);
  const { data: prefs } = usePreferences(userId);
  const [deviceNotifs, setDeviceNotifs] = useState(true);
  const { start: startTour } = useTour();

  useEffect(() => {
    void isDeviceNotificationsEnabled().then(setDeviceNotifs);
  }, []);

  async function toggleDeviceNotifs(value: boolean): Promise<void> {
    setDeviceNotifs(value);
    await setDeviceNotificationsEnabled(value);
  }

  async function toggle(key: PreferenceSwitch, value: boolean): Promise<void> {
    if (!userId) return;
    // Optimistic cache update, then persist (prefs_self_all RLS).
    queryClient.setQueryData(["preferences", userId], (old: Preferences | undefined) => ({
      ...(old ?? DEFAULT_PREFS),
      [key]: value,
    }));
    await updatePreference(userId, key, value);
    // The revisions screen and the home card read the same switch.
    if (key === "spacedRepetition") {
      await queryClient.invalidateQueries({ queryKey: ["revisions", userId] });
    }
    // The friends board says whether the reader is on their friends' boards.
    if (key === "friendsLeaderboard") {
      await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    }
  }

  async function chooseVisibility(value: LeaderboardVisibility): Promise<void> {
    if (!userId) return;
    queryClient.setQueryData(["preferences", userId], (old: Preferences | undefined) => ({
      ...(old ?? DEFAULT_PREFS),
      leaderboardVisibility: value,
    }));
    await updateLeaderboardVisibility(userId, value);
    await queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
  }

  const visibility = prefs?.leaderboardVisibility ?? DEFAULT_PREFS.leaderboardVisibility;

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      <SectionLabel eyebrow="Compte · RGPD" title="Réglages" />

      {/* Account */}
      <Rise index={0}>
        <Card style={{ gap: 10, marginBottom: 18 }}>
          <Text variant="micro" style={{ color: colors.accent }}>
            Compte
          </Text>
          <Row label="Pseudo" value={profile?.me.username ? `@${profile.me.username}` : "-"} />
          <Divider />
          <Row label="E-mail" value={session?.user.email ?? "-"} />
          <Divider />
          <Row
            label="Niveau"
            value={profile ? `NV.${String(profile.level.level)} · ${profile.tier.tier.label}` : "-"}
          />
        </Card>
      </Rise>

      {/* Notification prefs */}
      <Rise index={1}>
        <Card style={{ gap: 4, marginBottom: 18 }}>
          <Text variant="micro" style={{ color: colors.accent, marginBottom: 6 }}>
            Notifications
          </Text>
          {/* Device tray mirror (local to this phone) */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Sur cet appareil</Text>
              <Text variant="micro" style={{ color: colors.textMuted }}>
                {deviceNotificationsSupported()
                  ? "Badges, niveaux et certifs dans la barre de notifications"
                  : "Indisponible dans Expo Go · nécessite un build de l'app"}
              </Text>
            </View>
            <Switch
              value={deviceNotifs && deviceNotificationsSupported()}
              disabled={!deviceNotificationsSupported()}
              onValueChange={(v) => void toggleDeviceNotifs(v)}
              trackColor={{ false: colors.bgOverlay, true: "rgba(10,255,212,0.35)" }}
              thumbColor={deviceNotifs ? colors.accent : colors.textMuted}
            />
          </View>
          <Divider style={{ marginVertical: 6 }} />
          {PREF_ROWS.map((row, i) => (
            <View key={row.key}>
              {i > 0 ? <Divider style={{ marginVertical: 6 }} /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{row.label}</Text>
                  <Text variant="micro" style={{ color: colors.textMuted }}>
                    {row.hint}
                  </Text>
                </View>
                <Switch
                  value={prefs?.[row.key] ?? true}
                  onValueChange={(v) => void toggle(row.key, v)}
                  trackColor={{ false: colors.bgOverlay, true: "rgba(10,255,212,0.35)" }}
                  thumbColor={prefs?.[row.key] ? colors.accent : colors.textMuted}
                />
              </View>
            </View>
          ))}
        </Card>
      </Rise>

      {/* Privacy: the public board, the friends board, the profile page */}
      <Rise index={2}>
        <Card style={{ gap: 4, marginBottom: 18 }}>
          <Text variant="micro" style={{ color: colors.accent, marginBottom: 6 }}>
            Confidentialité
          </Text>
          <Text variant="h3">Visibilité dans le classement</Text>
          <Text variant="micro" style={{ color: colors.textMuted, marginBottom: 8 }}>
            Contrôle la manière dont tu apparais sur le leaderboard. Tu peux changer d'avis à tout
            moment.
          </Text>
          <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
            {VISIBILITY_OPTIONS.map((option) => {
              const selected = visibility === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${option.name}. ${option.desc}`}
                  onPress={() => void chooseVisibility(option.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: selected ? colors.accent : colors.borderSubtle,
                    backgroundColor: selected ? "rgba(10,255,212,0.06)" : "transparent",
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text variant="h3" style={{ color: selected ? colors.accent : undefined }}>
                      {option.name}
                    </Text>
                    {option.recommended ? (
                      <Text variant="micro" style={{ color: colors.textMuted }}>
                        Recommandé
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="bodySm">{option.desc}</Text>
                </Pressable>
              );
            })}
          </View>
          {PRIVACY_ROWS.map((row) => (
            <View key={row.key}>
              <Divider style={{ marginVertical: 8 }} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{row.label}</Text>
                  <Text variant="micro" style={{ color: colors.textMuted }}>
                    {row.hint}
                  </Text>
                </View>
                <Switch
                  value={prefs?.[row.key] ?? DEFAULT_PREFS[row.key]}
                  onValueChange={(v) => void toggle(row.key, v)}
                  trackColor={{ false: colors.bgOverlay, true: "rgba(10,255,212,0.35)" }}
                  thumbColor={
                    (prefs?.[row.key] ?? DEFAULT_PREFS[row.key]) ? colors.accent : colors.textMuted
                  }
                  accessibilityLabel={row.label}
                />
              </View>
            </View>
          ))}
        </Card>
      </Rise>

      {/* Legal + account management (web) */}
      <Rise index={3}>
        <Card style={{ padding: 0, marginBottom: 18 }}>
          <PressableScale
            onPress={() => router.push("/security")}
            style={{ flexDirection: "row", justifyContent: "space-between", padding: 14 }}
          >
            <Text variant="h3">Sécurité du compte</Text>
            <Text variant="micro" style={{ color: colors.accent }}>
              Ouvrir →
            </Text>
          </PressableScale>
          <Divider />
          <PressableScale
            onPress={() => router.push("/moderation")}
            style={{ flexDirection: "row", justifyContent: "space-between", padding: 14 }}
          >
            <Text variant="h3">Ma modération</Text>
            <Text variant="micro" style={{ color: colors.accent }}>
              Ouvrir →
            </Text>
          </PressableScale>
          <Divider />
          {[
            { label: "Modifier mon profil", url: "https://cyberlearn.fr/profile/edit" },
            { label: "Confidentialité", url: "https://cyberlearn.fr/privacy" },
            { label: "CGU", url: "https://cyberlearn.fr/legal/terms" },
            {
              label: "Exporter / supprimer mes données (RGPD)",
              url: "https://cyberlearn.fr/settings/data",
            },
          ].map((l, i) => (
            <View key={l.label}>
              {i > 0 ? <Divider /> : null}
              <PressableScale
                onPress={() => void WebBrowser.openBrowserAsync(l.url)}
                style={{ flexDirection: "row", justifyContent: "space-between", padding: 14 }}
              >
                <Text variant="h3">{l.label}</Text>
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  web ↗
                </Text>
              </PressableScale>
            </View>
          ))}
          <Divider />
          <PressableScale
            onPress={startTour}
            style={{ flexDirection: "row", justifyContent: "space-between", padding: 14 }}
          >
            <Text variant="h3">Revoir la visite guidée</Text>
            <Text variant="micro" style={{ color: colors.accent }}>
              ▶
            </Text>
          </PressableScale>
        </Card>
      </Rise>

      {/* Sign out */}
      <Rise index={4}>
        <PressableScale
          onPress={() => void supabase.auth.signOut()}
          style={{
            height: 46,
            borderWidth: 1,
            borderColor: "rgba(255,77,109,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text variant="micro" style={{ color: colors.danger }}>
            Se déconnecter
          </Text>
        </PressableScale>
        <Text
          variant="micro"
          style={{ textAlign: "center", marginTop: 14, color: colors.textDisabled }}
        >
          CyberLearn Mobile · v{Constants.expoConfig?.version ?? "2.3.0"}
        </Text>
      </Rise>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
      <Text variant="bodySm">{label}</Text>
      <Text variant="h3" numberOfLines={1} style={{ maxWidth: "65%", fontSize: 13 }}>
        {value}
      </Text>
    </View>
  );
}
