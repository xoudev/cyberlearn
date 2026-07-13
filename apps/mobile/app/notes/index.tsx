import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, Text } from "@/components/ui";
import { CATEGORY_COLOR } from "@/lib/db";
import { useNotes, type NoteItem } from "@/lib/queries";
import { useSession } from "@/lib/session";

function excerpt(content: string): string {
  const flat = content
    .replace(/[#*`>\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat || "Note vide";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function Notes(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useNotes(session?.user.id);

  const openNote = (n: NoteItem): void => {
    router.push({
      pathname: "/notes/[lessonId]",
      params: { lessonId: n.lessonId, title: n.lessonTitle },
    });
  };

  const folders = data?.folders ?? [];
  const notes = data?.notes ?? [];
  const byFolder = new Map<string | null, NoteItem[]>();
  for (const n of notes) {
    const key = n.folderId;
    const list = byFolder.get(key) ?? [];
    list.push(n);
    byFolder.set(key, list);
  }
  const unfiled = byFolder.get(null) ?? [];

  return (
    <Screen onRefresh={() => refetch()}>
      <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
        <Text variant="micro">← Retour</Text>
      </Pressable>

      <SectionLabel
        eyebrow="Bloc-notes"
        title="Mes notes"
        right={
          notes.length > 0 ? (
            <Text variant="micro">
              {notes.length} note{notes.length > 1 ? "s" : ""}
            </Text>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="NOTES_LOAD" />
      ) : notes.length === 0 ? (
        <EmptyState
          title="Aucune note"
          body="Ouvre une leçon et appuie sur « Notes » pour garder tes idées au chaud."
        />
      ) : (
        <View style={{ gap: 22 }}>
          {folders.map((f) => {
            const items = byFolder.get(f.id) ?? [];
            if (items.length === 0) return null;
            return (
              <View key={f.id}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      backgroundColor: f.color ?? colors.accent,
                    }}
                  />
                  <Text
                    variant="micro"
                    style={{ color: f.color ?? colors.accent, letterSpacing: 1.5 }}
                  >
                    {f.name} · {items.length}
                  </Text>
                </View>
                <View style={{ gap: 10 }}>
                  {items.map((n) => (
                    <NoteCard key={n.id} note={n} onPress={() => openNote(n)} />
                  ))}
                </View>
              </View>
            );
          })}
          {unfiled.length > 0 ? (
            <View>
              {folders.length > 0 ? (
                <Text variant="micro" style={{ marginBottom: 10, letterSpacing: 1.5 }}>
                  Sans dossier · {unfiled.length}
                </Text>
              ) : null}
              <View style={{ gap: 10 }}>
                {unfiled.map((n) => (
                  <NoteCard key={n.id} note={n} onPress={() => openNote(n)} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function NoteCard({ note, onPress }: { note: NoteItem; onPress: () => void }): React.JSX.Element {
  return (
    <PressableScale onPress={onPress}>
      <Card
        accent={CATEGORY_COLOR[note.category]}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="h3" numberOfLines={1}>
            {note.lessonTitle}
          </Text>
          <Text variant="bodySm" numberOfLines={2}>
            {excerpt(note.content)}
          </Text>
          <Text
            style={{
              fontFamily: `${fonts.mono}_400Regular`,
              fontSize: 10,
              color: colors.textDisabled,
            }}
          >
            {note.wordCount} mots · {fmtDate(note.updatedAt)}
          </Text>
        </View>
        <ChevronRight color={colors.textMuted} size={15} />
      </Card>
    </PressableScale>
  );
}
