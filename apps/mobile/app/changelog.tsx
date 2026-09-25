import React, { useEffect } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Card, Pill, Text } from "@/components/ui";
import {
  CHANGELOG,
  CHANGELOG_COPY,
  CHANGE_META,
  LATEST_VERSION,
  formatChangelogDate,
} from "@/lib/changelog";
import { useCosmetics } from "@/lib/cosmetics";
import { useChangelogSeen } from "@/lib/use-changelog-seen";

/**
 * The site's /changelog: every release, newest first, each change marked
 * Nouveau, Amélioration or Correctif. Opening it clears the "new" mark on the
 * profile hub, as the site's page clears its sidebar dot.
 */
export default function Changelog(): React.JSX.Element {
  const { theme } = useCosmetics();
  const { markSeen } = useChangelogSeen();

  useEffect(() => {
    void markSeen();
  }, [markSeen]);

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Profil" />
      </View>
      <View style={{ gap: 8, marginBottom: 20 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {`// ${CHANGELOG_COPY.eyebrow}`}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          {CHANGELOG_COPY.title}
        </Text>
        <Text variant="body">{CHANGELOG_COPY.intro}</Text>
      </View>

      <View style={{ gap: 14 }}>
        {CHANGELOG.map((entry) => {
          const latest = entry.version === LATEST_VERSION;
          return (
            <Card
              key={entry.version}
              accent={latest ? theme.accent : undefined}
              style={{ gap: 12 }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}
              >
                <Pill
                  label={`v${entry.version}`}
                  color={latest ? theme.accent : colors.textSecondary}
                />
                {latest ? <Pill label={CHANGELOG_COPY.latest} color={theme.accent} active /> : null}
                <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                  {formatChangelogDate(entry.date)}
                </Text>
              </View>
              <Text variant="h2">{entry.title}</Text>
              <View style={{ gap: 10 }}>
                {entry.changes.map((change, i) => {
                  const meta = CHANGE_META[change.type];
                  return (
                    <View key={`${entry.version}-${String(i)}`} style={{ gap: 4 }}>
                      <View style={{ alignSelf: "flex-start" }}>
                        <Text
                          variant="micro"
                          style={{
                            color: meta.color,
                            backgroundColor: meta.bg,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                          }}
                        >
                          {meta.label}
                        </Text>
                      </View>
                      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                        {change.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
