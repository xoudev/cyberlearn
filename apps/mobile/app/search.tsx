import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { TextInput, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Divider, Text } from "@/components/ui";
import { searchStyle } from "@/app/(tabs)/paths";
import { searchApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { CATEGORY_COLOR } from "@/lib/db";
import {
  SEARCH_COPY,
  SEARCH_DEBOUNCE_MS,
  isSearchable,
  searchTarget,
  type SearchResultItem,
} from "@/lib/search";

/**
 * The site's navbar search, as a screen: parcours first, then lessons, then
 * the reader's own notes, as they type. A result opens the app's screen for
 * it; a note opens on its lesson.
 */
export default function Search(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const [term, setTerm] = useState("");
  const [asked, setAsked] = useState("");

  // Asked once typing pauses, as the site's box does.
  useEffect(() => {
    const timer = setTimeout(() => setAsked(term.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const searchable = isSearchable(asked);
  const { data, isFetching, error, refetch } = useQuery({
    queryKey: ["search", asked],
    enabled: searchable,
    queryFn: () => searchApi(asked),
    staleTime: 30_000,
  });

  const open = (result: SearchResultItem): void => {
    router.push(searchTarget(result));
  };

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Accueil" />
      </View>
      <TextInput
        value={term}
        onChangeText={setTerm}
        placeholder={SEARCH_COPY.placeholder}
        placeholderTextColor={colors.textDisabled}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Rechercher"
        style={[searchStyle, { borderColor: term !== "" ? theme.accent : colors.borderDefault }]}
      />

      <View style={{ marginTop: 18, gap: 18 }}>
        {!searchable ? (
          <Text variant="bodySm" style={{ color: colors.textMuted }}>
            {SEARCH_COPY.hint}
          </Text>
        ) : error ? (
          <ErrorState onRetry={() => void refetch()} code="SEARCH" />
        ) : !data && isFetching ? (
          <ListSkeleton rows={3} />
        ) : data && data.length === 0 ? (
          <Text variant="bodySm" accessibilityLiveRegion="polite">
            {SEARCH_COPY.empty(asked)}
          </Text>
        ) : (
          (data ?? []).map((group) => (
            <View key={group.kind} style={{ gap: 8 }}>
              <Text variant="micro" style={{ color: theme.accent }}>
                {`// ${group.label}`}
              </Text>
              <Card style={{ padding: 0 }}>
                {group.results.map((result, i) => (
                  <View key={`${result.kind}-${result.id}`}>
                    {i > 0 ? <Divider /> : null}
                    <PressableScale onPress={() => open(result)}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          padding: 14,
                        }}
                      >
                        <View
                          style={{
                            width: 3,
                            alignSelf: "stretch",
                            backgroundColor:
                              result.category !== null
                                ? CATEGORY_COLOR[result.category]
                                : colors.borderDefault,
                          }}
                        />
                        <View style={{ flex: 1, gap: 3 }}>
                          <Text variant="h3" numberOfLines={1}>
                            {result.title}
                          </Text>
                          {result.subtitle !== "" ? (
                            <Text variant="bodySm" numberOfLines={2}>
                              {result.subtitle}
                            </Text>
                          ) : null}
                          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                            {result.meta}
                          </Text>
                        </View>
                        <ChevronRight color={colors.textMuted} size={14} />
                      </View>
                    </PressableScale>
                  </View>
                ))}
              </Card>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}
