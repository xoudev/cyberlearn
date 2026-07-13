import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, Switch, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Rise } from "@/components/anim";
import { Screen } from "@/components/screen";
import { Card, Divider, SectionLabel, Text } from "@/components/ui";
import { updatePreference, usePreferences, useProfile, type Preferences } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

const PREF_ROWS: { key: keyof Preferences; label: string; hint: string }[] = [
  { key: "emailNotifications", label: "E-mails", hint: "Notifications par e-mail" },
  { key: "reviewReminders", label: "Rappels de révision", hint: "Quand une révision SM-2 est due" },
  { key: "weeklyDigest", label: "Digest hebdo", hint: "Résumé de ta semaine" },
  { key: "streakReminder", label: "Rappel de série", hint: "Avant de perdre ta série" },
];

export default function Reglages(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data: profile } = useProfile(userId);
  const { data: prefs } = usePreferences(userId);

  async function toggle(key: keyof Preferences, value: boolean): Promise<void> {
    if (!userId) return;
    // Optimistic cache update, then persist (prefs_self_all RLS).
    queryClient.setQueryData(["preferences", userId], (old: Preferences | undefined) => ({
      ...(old ?? {
        emailNotifications: true,
        reviewReminders: true,
        weeklyDigest: true,
        streakReminder: true,
      }),
      [key]: value,
    }));
    await updatePreference(userId, key, value);
  }

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text variant="micro">← Retour</Text>
      </Pressable>

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

      {/* Legal + account management (web) */}
      <Rise index={2}>
        <Card style={{ padding: 0, marginBottom: 18 }}>
          {[
            { label: "Modifier mon profil", url: "https://www.cyberlearn.fr/profile/edit" },
            { label: "Confidentialité", url: "https://www.cyberlearn.fr/privacy" },
            { label: "CGU", url: "https://www.cyberlearn.fr/terms" },
            {
              label: "Exporter / supprimer mes données (RGPD)",
              url: "https://www.cyberlearn.fr/settings/data",
            },
          ].map((l, i) => (
            <View key={l.label}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => void WebBrowser.openBrowserAsync(l.url)}
                style={{ flexDirection: "row", justifyContent: "space-between", padding: 14 }}
              >
                <Text variant="h3">{l.label}</Text>
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  web ↗
                </Text>
              </Pressable>
            </View>
          ))}
        </Card>
      </Rise>

      {/* Sign out */}
      <Rise index={3}>
        <Pressable
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
        </Pressable>
        <Text
          variant="micro"
          style={{ textAlign: "center", marginTop: 14, color: colors.textDisabled }}
        >
          CyberLearn Mobile · v0.1.0
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
