import React, { useMemo, useState } from "react";
import { ActivityIndicator, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PathCardView } from "@/components/cards";
import { Screen } from "@/components/screen";
import { SectionLabel, Text } from "@/components/ui";
import { usePaths } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function Parcours(): React.JSX.Element {
  const { session } = useSession();
  const { data, isLoading, error } = usePaths(session?.user.id);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    const paths = data ?? [];
    if (!s) return paths;
    return paths.filter(
      (p) => p.title.toLowerCase().includes(s) || p.description.toLowerCase().includes(s),
    );
  }, [data, query]);

  return (
    <Screen>
      <SectionLabel
        eyebrow="Cyber Learn"
        title="Catalogue Parcours"
        right={data ? <Text variant="micro">{data.length} parcours</Text> : undefined}
      />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un parcours…"
        placeholderTextColor={colors.textDisabled}
        style={searchStyle}
      />
      <View style={{ height: 16 }} />
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text variant="bodySm" style={{ textAlign: "center", marginTop: 40, color: colors.danger }}>
          Chargement impossible.
        </Text>
      ) : filtered.length === 0 ? (
        <Text variant="bodySm" style={{ textAlign: "center", marginTop: 40 }}>
          Aucun parcours ne correspond.
        </Text>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((p) => (
            <PathCardView key={p.id} path={p} />
          ))}
        </View>
      )}
    </Screen>
  );
}

export const searchStyle = {
  height: 44,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: "rgba(5,4,26,0.6)",
  color: colors.textPrimary,
  fontFamily: `${fonts.mono}_400Regular`,
  fontSize: 13,
  paddingHorizontal: 14,
} as const;
