import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { PathCardView } from "@/components/cards";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { useTourAnchor } from "@/components/tour";
import { Pill, SectionLabel, Text } from "@/components/ui";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  DIFFICULTY_LABEL,
  DIFFICULTY_ORDER,
  type Category,
  type Difficulty,
} from "@/lib/db";
import { usePaths } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function Parcours(): React.JSX.Element {
  const { session } = useSession();
  const { data, isLoading, error, refetch } = usePaths(session?.user.id);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL");
  const searchAnchor = useTourAnchor("paths-search");

  const filtered = useMemo(() => {
    const s = query.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (category !== "ALL" && p.category !== category) return false;
      if (difficulty !== "ALL" && p.difficulty !== difficulty) return false;
      if (s && !p.title.toLowerCase().includes(s) && !p.description.toLowerCase().includes(s))
        return false;
      return true;
    });
  }, [data, query, category, difficulty]);

  const hasFilter = category !== "ALL" || difficulty !== "ALL" || query.length > 0;
  const reset = (): void => {
    setCategory("ALL");
    setDifficulty("ALL");
    setQuery("");
  };

  return (
    <Screen onRefresh={() => refetch()} padForTabBar>
      <SectionLabel
        eyebrow="Cyber Learn"
        title="Catalogue Parcours"
        right={data ? <Text variant="micro">{filtered.length} parcours</Text> : undefined}
      />
      <View ref={searchAnchor} collapsable={false}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un parcours…"
          placeholderTextColor={colors.textDisabled}
          style={searchStyle}
        />
      </View>

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
      >
        <PressableScale onPress={() => setCategory("ALL")}>
          <Pill label="Tous" color={colors.accent} active={category === "ALL"} />
        </PressableScale>
        {CATEGORY_ORDER.map((c) => (
          <PressableScale key={c} onPress={() => setCategory(c)}>
            <Pill
              label={CATEGORY_LABEL[c]}
              color={CATEGORY_COLOR[c]}
              active={category === c}
              dot={CATEGORY_COLOR[c]}
            />
          </PressableScale>
        ))}
      </ScrollView>

      {/* Difficulty filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 14 }}
      >
        <PressableScale onPress={() => setDifficulty("ALL")}>
          <Pill label="Tous niveaux" color={colors.textSecondary} active={difficulty === "ALL"} />
        </PressableScale>
        {DIFFICULTY_ORDER.map((d) => (
          <PressableScale key={d} onPress={() => setDifficulty(d)}>
            <Pill
              label={DIFFICULTY_LABEL[d]}
              color={colors.textSecondary}
              active={difficulty === d}
            />
          </PressableScale>
        ))}
      </ScrollView>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="PATHS_LOAD" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucun parcours trouvé"
          body={
            hasFilter
              ? "Rien ne correspond à ces filtres. Élargis ta recherche."
              : "Le catalogue arrive bientôt."
          }
          actionLabel={hasFilter ? "Réinitialiser" : undefined}
          onAction={hasFilter ? reset : undefined}
        />
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
  borderRadius: 12,
  height: 44,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  backgroundColor: "rgba(5,4,26,0.6)",
  color: colors.textPrimary,
  fontFamily: `${fonts.mono}_400Regular`,
  fontSize: 13,
  paddingHorizontal: 14,
} as const;
