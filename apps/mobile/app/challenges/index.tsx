import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, Text } from "@/components/ui";
import { WeeklyCountdown } from "@/components/weekly-countdown";
import {
  attemptsLeft,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  FILTER_LABEL,
  matchesFilter,
  splitWeekly,
  STATUS_META,
  tallyOf,
  xpLine,
  type ChallengeFilter,
  type ChallengeItem,
  type WeeklyChallenge,
} from "@/lib/challenges";
import { useChallenges } from "@/lib/queries";
import { useSession } from "@/lib/session";

/** The challenges' own red, as on the site's page. */
const ACCENT = colors.danger;

const TALLY_WORD: Record<ChallengeItem["displayStatus"], string> = {
  COMPLETED: "résolu",
  IN_PROGRESS: "en cours",
  AVAILABLE: "disponible",
  LOCKED: "verrouillé",
};

/**
 * The site's /challenges: the week's challenge, worth twice its XP until
 * Monday, then every other challenge under three tabs, each with where the
 * learner stands and the way in. A locked one leads to the challenge that
 * opens it.
 */
export default function ChallengesList(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useChallenges(session?.user.id);
  const [filter, setFilter] = useState<ChallengeFilter>("all");

  const open = (slug: string): void => {
    router.push({ pathname: "/challenges/[slug]", params: { slug } });
  };

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <View style={{ gap: 8, marginBottom: 20 }}>
        <Text variant="micro" style={{ color: ACCENT }}>
          {"// Défis"}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          Défis
        </Text>
        <Text variant="body">
          Des enquêtes sur pièces : une machine Linux, ses fichiers, un flag à trouver. La machine
          se joue sur le site ; le flag se donne ici ou là-bas.
        </Text>
        {data && data.items.length > 0 ? (
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {tallyOf(data.items)
              .map(({ status, n }) =>
                status === "IN_PROGRESS"
                  ? `${String(n)} ${TALLY_WORD[status]}`
                  : `${String(n)} ${TALLY_WORD[status]}${n > 1 ? "s" : ""}`,
              )
              .join(" · ")}
          </Text>
        ) : null}
      </View>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="CHALLENGES_LOAD" />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Les défis arrivent"
          body="Le catalogue est en préparation. Les premiers défis seront ici dès leur publication."
        />
      ) : (
        <ChallengesBody
          items={data.items}
          weekly={data.weekly}
          filter={filter}
          onFilter={setFilter}
          onOpen={open}
          onWeekEnd={() => void refetch()}
        />
      )}
    </Screen>
  );
}

function ChallengesBody({
  items,
  weekly,
  filter,
  onFilter,
  onOpen,
  onWeekEnd,
}: {
  items: ChallengeItem[];
  weekly: WeeklyChallenge | null;
  filter: ChallengeFilter;
  onFilter: (filter: ChallengeFilter) => void;
  onOpen: (slug: string) => void;
  onWeekEnd: () => void;
}): React.JSX.Element {
  const split = splitWeekly({ items, weekly });
  // Under "Tous" the week's challenge has its card above; a tab shows it too.
  const shown = items.filter(
    (item) => matchesFilter(item, filter) && (filter !== "all" || item.id !== split.weekly?.id),
  );

  return (
    <View style={{ gap: 18 }}>
      {split.weekly !== null && weekly !== null ? (
        <WeeklyCard item={split.weekly} weekly={weekly} onOpen={onOpen} onWeekEnd={onWeekEnd} />
      ) : null}

      <View style={{ gap: 10 }}>
        <Text variant="h2">Tous les défis</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["all", "todo", "done"] as const).map((key) => (
            <PressableScale
              key={key}
              onPress={() => {
                onFilter(key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === key }}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Pill
                label={`${FILTER_LABEL[key]} · ${String(items.filter((i) => matchesFilter(i, key)).length)}`}
                color={ACCENT}
                active={filter === key}
              />
            </PressableScale>
          ))}
        </ScrollView>
      </View>

      {shown.length === 0 && filter !== "all" ? (
        <EmptyState
          title={filter === "done" ? "Aucun défi résolu" : "Rien à faire pour l'instant"}
          body={
            filter === "done"
              ? "Le défi de la semaine vaut le double d'XP : c'est un bon premier."
              : "Tout ce qui est ouvert est résolu. Un défi verrouillé s'ouvre quand celui qui le précède est fait."
          }
          actionLabel="Voir tous les défis"
          onAction={() => {
            onFilter("all");
          }}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {shown.map((item) => (
            <ChallengeCard key={item.id} item={item} onOpen={onOpen} />
          ))}
          {filter === "all" ? (
            <Card style={{ gap: 6, borderStyle: "dashed", backgroundColor: "transparent" }}>
              <Text variant="micro" style={{ color: ACCENT }}>
                Chaque lundi
              </Text>
              <Text variant="h3">Un nouveau défi de la semaine</Text>
              <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                Chaque défi du catalogue passe à son tour en défi de la semaine, du lundi au
                dimanche, et vaut alors le double de son XP.
              </Text>
              {split.next !== null ? (
                <Text variant="bodySm" style={{ color: colors.textSecondary }}>
                  {"La semaine prochaine : "}
                  <Text style={{ color: colors.textPrimary }}>{split.next.title}</Text>.
                </Text>
              ) : null}
            </Card>
          ) : null}
        </View>
      )}
    </View>
  );
}

/** The shape of a locked challenge's evidence: lines, not their content. */
const REDACTED: readonly `${number}%`[] = ["88%", "62%", "74%"];

/** What the challenge hands over: its first lines, or bars where a locked one hides it. */
function Evidence({ item }: { item: ChallengeItem }): React.JSX.Element | null {
  if (item.displayStatus === "LOCKED") {
    return (
      <View style={{ gap: 6 }} accessibilityLabel="Contenu verrouillé">
        {REDACTED.map((width) => (
          <View
            key={width}
            style={{ height: 8, width, backgroundColor: `${colors.textMuted}55` }}
          />
        ))}
      </View>
    );
  }
  const lines = item.evidence?.excerpt?.lines ?? [];
  if (lines.length > 0) {
    return (
      <View style={{ gap: 2 }}>
        {lines.map((line, index) => (
          <Text
            key={`${String(index)}-${line}`}
            numberOfLines={1}
            style={{
              fontFamily: `${fonts.mono}_400Regular`,
              fontSize: 10.5,
              color: colors.textSecondary,
            }}
          >
            {line}
          </Text>
        ))}
      </View>
    );
  }
  return null;
}

function WeeklyCard({
  item,
  weekly,
  onOpen,
  onWeekEnd,
}: {
  item: ChallengeItem;
  weekly: WeeklyChallenge;
  onOpen: (slug: string) => void;
  onWeekEnd: () => void;
}): React.JSX.Element {
  const solved = item.displayStatus === "COMPLETED";
  const locked = item.displayStatus === "LOCKED";
  const prerequisite = locked ? (item.prerequisiteSlug ?? null) : null;
  const action = solved
    ? "REVOIR LE DÉFI"
    : locked
      ? item.lockedByTitle !== null
        ? `TERMINE D'ABORD « ${item.lockedByTitle.toUpperCase()} »`
        : "VERROUILLÉ"
      : item.displayStatus === "IN_PROGRESS"
        ? "REPRENDRE LE DÉFI"
        : "RELEVER LE DÉFI";
  const listing = item.evidence?.listing ?? [];

  return (
    <Card accent={ACCENT} style={{ gap: 12, borderColor: `${ACCENT}66` }}>
      <Text variant="micro" style={{ color: ACCENT }}>
        {`Défi de la semaine · ${item.refCode}`}
      </Text>
      <Text variant="display" style={{ fontSize: 24 }}>
        {item.title}
      </Text>
      <Text variant="bodySm" style={{ color: colors.textSecondary }}>
        {item.description}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        <Pill label={CATEGORY_LABEL[item.category]} color={colors.textSecondary} />
        <Pill label={DIFFICULTY_LABEL[item.difficulty]} color={colors.textSecondary} />
        {item.displayStatus !== "AVAILABLE" ? (
          <Pill
            label={STATUS_META[item.displayStatus].label}
            color={STATUS_META[item.displayStatus].color}
          />
        ) : null}
      </View>

      {locked ? (
        <Evidence item={item} />
      ) : listing.length > 0 ? (
        <View
          style={{
            padding: 12,
            backgroundColor: colors.bgBase,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          {listing.map((line, index) => (
            <Text
              key={`${String(index)}-${line.text}`}
              style={{
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 11.5,
                color: line.kind === "cmd" ? colors.textPrimary : colors.textSecondary,
              }}
            >
              {line.kind === "cmd" ? <Text style={{ color: ACCENT }}>{"$ "}</Text> : null}
              {line.text}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        {item.supplied !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {`Fourni : ${item.supplied}`}
          </Text>
        ) : null}
        <Text variant="bodySm" style={{ color: colors.textPrimary }}>
          {solved
            ? xpLine(item)
            : `${String(item.xpReward * weekly.multiplier)} XP cette semaine, au lieu de ${String(item.xpReward)}`}
        </Text>
        {!solved && !locked ? (
          <Text variant="bodySm" style={{ color: colors.textMuted }}>
            {`${String(attemptsLeft(item))} essais sur ${String(item.maxAttempts)}`}
          </Text>
        ) : null}
      </View>

      <WeeklyCountdown
        endsAt={weekly.endsAt}
        prefix={solved ? "Prochain défi dans" : `XP ×${String(weekly.multiplier)} encore`}
        onEnd={onWeekEnd}
      />

      <PressableScale
        accessibilityLabel={action}
        disabled={locked && prerequisite === null}
        onPress={() => {
          onOpen(prerequisite ?? item.slug);
        }}
        style={{
          minHeight: 48,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 12,
          backgroundColor: solved || locked ? "transparent" : ACCENT,
          borderWidth: 1,
          borderColor: solved ? colors.borderDefault : ACCENT,
        }}
      >
        <Text
          variant="micro"
          style={{
            color: solved ? colors.textSecondary : locked ? ACCENT : colors.textPrimary,
            letterSpacing: 1.2,
            textAlign: "center",
          }}
        >
          {`${action} →`}
        </Text>
      </PressableScale>
    </Card>
  );
}

function ChallengeCard({
  item,
  onOpen,
}: {
  item: ChallengeItem;
  onOpen: (slug: string) => void;
}): React.JSX.Element {
  const status = STATUS_META[item.displayStatus];
  const locked = item.displayStatus === "LOCKED";
  const prerequisite = locked ? (item.prerequisiteSlug ?? null) : null;
  const left = attemptsLeft(item);
  const action =
    item.displayStatus === "COMPLETED"
      ? "Voir le défi"
      : item.displayStatus === "IN_PROGRESS"
        ? `Reprendre · ${String(left)} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}`
        : locked
          ? item.lockedByTitle !== null
            ? `Termine d'abord « ${item.lockedByTitle} »`
            : "Verrouillé"
          : "Relever le défi";

  return (
    <PressableScale
      accessibilityLabel={`${item.title}, ${status.label}. ${action}`}
      disabled={locked && prerequisite === null}
      onPress={() => {
        onOpen(prerequisite ?? item.slug);
      }}
    >
      <Card
        style={{
          gap: 8,
          padding: 0,
          borderColor:
            item.displayStatus === "COMPLETED" ? `${colors.success}66` : colors.borderDefault,
        }}
      >
        <View style={{ gap: 10, padding: 14, backgroundColor: colors.bgBase }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Text variant="micro" style={{ color: colors.textMuted }}>
              {CATEGORY_LABEL[item.category]}
            </Text>
            <Pill
              label={status.label}
              color={status.color}
              active={item.displayStatus === "COMPLETED"}
            />
          </View>
          <Evidence item={item} />
        </View>
        <View style={{ gap: 6, paddingHorizontal: 14 }}>
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {`${item.refCode} · ${DIFFICULTY_LABEL[item.difficulty]}`}
          </Text>
          <Text variant="h3" style={{ color: locked ? colors.textMuted : colors.textPrimary }}>
            {item.title}
          </Text>
          <Text variant="bodySm" style={{ color: colors.textSecondary }} numberOfLines={3}>
            {item.description}
          </Text>
          <Text
            variant="mono"
            style={{
              fontSize: 11,
              color: item.displayStatus === "COMPLETED" ? colors.success : colors.textPrimary,
            }}
          >
            {xpLine(item)}
          </Text>
        </View>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.borderSubtle,
            paddingVertical: 12,
            paddingHorizontal: 14,
            alignItems: "center",
          }}
        >
          <Text
            variant="micro"
            style={{
              color:
                item.displayStatus === "COMPLETED"
                  ? colors.success
                  : item.displayStatus === "IN_PROGRESS"
                    ? colors.warning
                    : locked
                      ? colors.textSecondary
                      : ACCENT,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            {`${action}${locked && prerequisite === null ? "" : " →"}`}
          </Text>
        </View>
      </Card>
    </PressableScale>
  );
}
