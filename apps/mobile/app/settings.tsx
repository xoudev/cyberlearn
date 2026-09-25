import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import {
  NOTIFICATION_SETTINGS,
  SPACED_REPETITION_SETTING,
} from "@cyberlearn/lib/settings/notifications";
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
import { updatePreference, usePreferences, useProfile, type Preferences } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// The site's words: spaced repetition (with the preferences on the site),
// then the switches of /settings/notifications. A switch for something that
// nothing sends yet is shown, and disabled, as on the site: a live-looking
// switch would be a promise.
const PREF_ROWS: { key: keyof Preferences; label: string; hint: string; available: boolean }[] = [
  {
    key: "spacedRepetition",
    label: SPACED_REPETITION_SETTING.name,
    hint: SPACED_REPETITION_SETTING.descOn,
    available: true,
  },
  ...NOTIFICATION_SETTINGS.map((setting) => ({
    key: setting.key,
    label: setting.name,
    hint: setting.desc,
    available: setting.available,
  })),
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

  async function toggle(key: keyof Preferences, value: boolean): Promise<void> {
    if (!userId) return;
    // Optimistic cache update, then persist (prefs_self_all RLS).
    queryClient.setQueryData(["preferences", userId], (old: Preferences | undefined) => ({
      ...(old ?? {
        emailNotifications: true,
        reviewReminders: true,
        weeklyDigest: true,
        streakReminder: true,
        spacedRepetition: true,
      }),
      [key]: value,
    }));
    await updatePreference(userId, key, value);
    // The revisions screen and the home card read the same switch.
    if (key === "spacedRepetition") {
      await queryClient.invalidateQueries({ queryKey: ["revisions", userId] });
    }
  }

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
          {PREF_ROWS.map((row, i) => {
            const value = prefs?.[row.key] ?? true;
            const hint =
              row.key === "spacedRepetition" && !value
                ? SPACED_REPETITION_SETTING.descOff
                : row.hint;
            return (
              <View key={row.key}>
                {i > 0 ? <Divider style={{ marginVertical: 6 }} /> : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="h3">
                      {row.label}
                      {row.available ? null : (
                        <Text variant="micro" style={{ color: colors.warning }}>
                          {"  ·  bientôt"}
                        </Text>
                      )}
                    </Text>
                    <Text variant="micro" style={{ color: colors.textMuted }}>
                      {hint}
                    </Text>
                  </View>
                  <Switch
                    value={value}
                    disabled={!row.available}
                    onValueChange={(v) => void toggle(row.key, v)}
                    trackColor={{ false: colors.bgOverlay, true: "rgba(10,255,212,0.35)" }}
                    thumbColor={value && row.available ? colors.accent : colors.textMuted}
                    accessibilityLabel={row.label}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      </Rise>

      {/* Legal + account management (web) */}
      <Rise index={2}>
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
          {[
            { label: "Modifier mon profil", route: "/profile-edit" },
            { label: "Confidentialité", url: "https://cyberlearn.fr/privacy" },
            { label: "CGU", url: "https://cyberlearn.fr/legal/terms" },
            {
              label: "Exporter / supprimer mes données (RGPD)",
              url: "https://cyberlearn.fr/settings/data",
            },
          ].map((l: { label: string; url?: string; route?: string }, i) => (
            <View key={l.label}>
              {i > 0 ? <Divider /> : null}
              <PressableScale
                onPress={() => {
                  // SAFETY: typed routes are disabled; expo-router accepts any
                  // registered pathname string at runtime.
                  if (l.route) router.push(l.route as never);
                  else if (l.url) void WebBrowser.openBrowserAsync(l.url);
                }}
                style={{ flexDirection: "row", justifyContent: "space-between", padding: 14 }}
              >
                <Text variant="h3">{l.label}</Text>
                <Text variant="micro" style={{ color: l.route ? colors.accent : colors.textMuted }}>
                  {l.route ? "Ouvrir →" : "web ↗"}
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
      <Rise index={3}>
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
