import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Divider, Text } from "@/components/ui";
import { fetchShareAudienceApi, shareNoteApi, unshareNoteApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  NO_AUDIENCE,
  SHARE_REASSURANCE,
  groupAudience,
  shareDoneLabel,
  type ShareAudienceEntry,
} from "@/lib/note-share";

/**
 * Who gets the note: the site's share dialog, as a screen. A list of people
 * rather than an address field: the note goes to people the author is already
 * tied to (their classes, their friends), so those ties are what is shown,
 * and there is nothing to type. The screen reading the note, and telling the
 * teachers when it refuses one, happen on the server.
 */
export default function ShareNote(): React.JSX.Element {
  const { noteId, title } = useLocalSearchParams<{ noteId: string; title?: string }>();
  const queryClient = useQueryClient();
  const queryKey = ["note-share", noteId];
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    enabled: Boolean(noteId),
    queryFn: () => fetchShareAudienceApi(noteId),
  });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const groups = useMemo(() => groupAudience(data?.entries ?? []), [data]);

  const markHolders = (ids: Set<string>, holds: boolean): void => {
    queryClient.setQueryData(queryKey, (old: typeof data) =>
      old
        ? {
            ...old,
            entries: old.entries.map((e) => (ids.has(e.id) ? { ...e, holds } : e)),
          }
        : old,
    );
  };

  const toggle = (id: string): void => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setProblem(null);
    setDone(null);
  };

  const send = async (): Promise<void> => {
    if (picked.size === 0 || busy) return;
    setBusy(true);
    setProblem(null);
    setDone(null);
    const reply = await shareNoteApi(noteId, [...picked]);
    setBusy(false);
    if (!reply.ok) {
      setProblem(reply.error ?? "Partage impossible.");
      return;
    }
    setDone(shareDoneLabel(reply.shared ?? 0));
    markHolders(picked, true);
    setPicked(new Set());
  };

  const takeBack = async (id: string): Promise<void> => {
    setBusy(true);
    const ok = await unshareNoteApi(noteId, id);
    setBusy(false);
    if (!ok) return;
    markHolders(new Set([id]), false);
    setDone(null);
  };

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Note" />
      </View>
      <View style={{ gap: 6, marginBottom: 16 }}>
        <Text variant="micro" style={{ color: colors.accent }}>
          Partager
        </Text>
        <Text variant="h2" numberOfLines={2}>
          {title ?? "Ma note"}
        </Text>
        <Text variant="bodySm">{SHARE_REASSURANCE}</Text>
      </View>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="NOTE_SHARE" />
      ) : data.noAudience ? (
        <Card>
          <Text variant="bodySm">{NO_AUDIENCE}</Text>
        </Card>
      ) : (
        <View style={{ gap: 18 }}>
          {groups.map((group) => (
            <View key={group.id} style={{ gap: 8 }}>
              <Text variant="micro" style={{ color: colors.textMuted }}>
                {group.label}
              </Text>
              <Card style={{ padding: 0 }}>
                {group.people.map((person, i) => (
                  <View key={person.id}>
                    {i > 0 ? <Divider /> : null}
                    <PersonRow
                      person={person}
                      picked={picked.has(person.id)}
                      busy={busy}
                      onToggle={() => toggle(person.id)}
                      onTakeBack={() => void takeBack(person.id)}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))}

          {problem !== null ? (
            <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
              {problem}
            </Text>
          ) : null}
          {done !== null ? (
            <Text
              variant="bodySm"
              accessibilityLiveRegion="polite"
              style={{ color: colors.accent }}
            >
              {done}
            </Text>
          ) : null}

          <GradientButton
            label={picked.size === 0 ? "Partager" : `Partager (${String(picked.size)})`}
            disabled={picked.size === 0}
            loading={busy}
            onPress={() => void send()}
          />
        </View>
      )}
    </Screen>
  );
}

/**
 * One person. Somebody who already holds the note gets a mark and a way to
 * take it back rather than a dead checkbox: a box that cannot be ticked reads
 * as "not allowed", which is the opposite of what it means here.
 */
function PersonRow({
  person,
  picked,
  busy,
  onToggle,
  onTakeBack,
}: {
  person: ShareAudienceEntry;
  picked: boolean;
  busy: boolean;
  onToggle: () => void;
  onTakeBack: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const name = (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="h3" numberOfLines={1}>
        {person.name}
      </Text>
      {person.kind === "TEACHER" ? (
        <Text variant="micro" style={{ color: theme.accent }}>
          Professeur
        </Text>
      ) : null}
    </View>
  );

  if (person.holds) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: `${theme.accent}0D`,
        }}
      >
        <Text
          accessibilityLabel="A déjà cette note"
          style={{ width: 22, textAlign: "center", color: theme.accent }}
        >
          ✓
        </Text>
        {name}
        <ActionChip label="Reprendre" tone="neutral" disabled={busy} onPress={onTakeBack} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: picked, disabled: busy }}
      accessibilityLabel={person.kind === "TEACHER" ? `${person.name}, professeur` : person.name}
      disabled={busy}
      onPress={onToggle}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 1.5,
          borderColor: picked ? theme.accent : colors.borderDefault,
          backgroundColor: picked ? theme.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {picked ? <Text style={{ color: colors.bgBase, fontSize: 13 }}>✓</Text> : null}
      </View>
      {name}
    </Pressable>
  );
}
