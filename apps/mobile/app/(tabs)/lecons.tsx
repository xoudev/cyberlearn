import React, { useDeferredValue, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { Rise, PressableScale } from "@/components/anim";
import { LessonCardView } from "@/components/cards";
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
import { useLessons } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { searchStyle } from "@/app/(tabs)/parcours";

export default function Lecons(): React.JSX.Element {
  const { session } = useSession();
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [difficulty, setDifficulty] = useState<Difficulty | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const filtersAnchor = useTourAnchor("lessons-filters");

  // Category / difficulty go to the server (stable query key); free-text search
  // filters the fetched page client-side so typing does not refetch every key.
  const { data, isLoading, error, refetch } = useLessons(session?.user.id, {
    search: "",
    category,
    difficulty,
  });

  const filtered = useMemo(() => {
    const s = deferredQuery.trim().toLowerCase();
    const lessons = data ?? [];
    if (!s) return lessons;
    return lessons.filter(
      (l) => l.title.toLowerCase().includes(s) || l.description.toLowerCase().includes(s),
    );
  }, [data, deferredQuery]);

  function reset(): void {
    setCategory("ALL");
    setDifficulty("ALL");
    setQuery("");
  }

  return (
    <Screen onRefresh={() => refetch()}>
      <SectionLabel eyebrow="Cyber Learn" title="Catalogue Leçons" />
      <View ref={filtersAnchor} collapsable={false}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une leçon…"
          placeholderTextColor={colors.textDisabled}
          style={searchStyle}
        />
      </View>

      {/* Domain filters */}
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
        <ErrorState onRetry={() => void refetch()} code="LESSONS_LOAD" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune leçon trouvée"
          body={
            query
              ? `Rien pour « ${query} ». Essaie un autre mot-clé ou élargis les filtres.`
              : "Aucune leçon ne correspond à ces filtres."
          }
          actionLabel="Réinitialiser les filtres"
          onAction={reset}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((l, i) => (
            <Rise key={l.id} index={Math.min(i, 6)}>
              <LessonCardView lesson={l} />
            </Rise>
          ))}
        </View>
      )}
    </Screen>
  );
}
