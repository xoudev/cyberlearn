import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState } from "@/components/states";
import { Text } from "@/components/ui";
import { WrappedStory } from "@/components/wrapped-story";
import { fetchWrappedApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { opensLabel } from "@/lib/wrapped";

/**
 * Wrapped, as on the site: opened from an entry that only exists while it is
 * open (1 December to 7 January), never a permanent tab. Out of season, the
 * site's closed page: when it opens, and that everything done until then
 * counts for the next one.
 */
export default function Wrapped(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const [now] = useState(() => Date.now());
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["wrapped"],
    queryFn: fetchWrappedApi,
  });

  if (data?.open === true && data.payload !== null) {
    return (
      <Screen scroll={false}>
        <WrappedStory payload={data.payload} handle={data.handle} onClose={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      {isLoading ? (
        <View style={{ gap: 10, paddingTop: 40 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            Cyber Learn · Récap
          </Text>
          <Text variant="body">Calcul de ton année…</Text>
        </View>
      ) : error || !data || data.open ? (
        <ErrorState onRetry={() => void refetch()} code="WRAPPED_LOAD" />
      ) : (
        <View style={{ gap: 14, paddingTop: 20 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            CyberLearn Wrapped
          </Text>
          <Text
            style={{
              fontFamily: `${fonts.sans}_800ExtraBold`,
              fontSize: 56,
              color: colors.textPrimary,
            }}
          >
            {data.periodKey}
          </Text>
          <Text variant="body" style={{ color: colors.textSecondary }}>
            Ton récap de l'année n'est pas encore ouvert. Il arrive en décembre, une fois par an, le
            temps que l'année ait quelque chose à raconter.
          </Text>
          {data.opensOn !== null ? (
            <Text variant="mono" style={{ fontSize: 12, color: colors.textPrimary }}>
              {opensLabel(data.opensOn, now)}
            </Text>
          ) : null}
          <Text variant="bodySm">D'ici là, tout ce que tu termines compte pour le prochain.</Text>
        </View>
      )}
    </Screen>
  );
}
