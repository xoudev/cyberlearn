import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { Card, Text } from "@/components/ui";
import { fetchReceivedNotesApi } from "@/lib/api";
import { CATEGORY_COLOR, CATEGORY_LABEL, type Category } from "@/lib/db";
import { noteExcerpt, receivedCountLabel, timeAgo } from "@/lib/note-share";

/**
 * The notes other people handed to the reader: the site's "Reçues". Only
 * shown when there are any, as on the site: an empty block on every
 * student's page would be furniture. Read-only, and not filed anywhere.
 *
 * The query key sits under ["notes", userId], so whatever refreshes the
 * library (pulling it down, a change to a note) reads these again too.
 */
export function useReceivedNotes(userId: string | undefined) {
  return useQuery({
    queryKey: ["notes", userId, "received"],
    enabled: Boolean(userId),
    queryFn: fetchReceivedNotesApi,
  });
}

function categoryOf(value: string): Category | null {
  return value === "DEV" || value === "CYBERSEC" || value === "NETWORK" ? value : null;
}

export function ReceivedNotes({
  userId,
}: { userId: string | undefined }): React.JSX.Element | null {
  const router = useRouter();
  const { data } = useReceivedNotes(userId);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!data || data.length === 0) return null;

  return (
    <View style={{ gap: 10, marginBottom: 22 }} accessibilityLabel="Notes reçues">
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Text variant="h3">Reçues</Text>
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {receivedCountLabel(data.length)}
        </Text>
      </View>
      {data.map((note) => {
        const category = categoryOf(note.lessonCategory);
        const tint = category ? CATEGORY_COLOR[category] : colors.textMuted;
        return (
          <Card key={note.id} accent={tint} style={{ padding: 0 }}>
            <PressableScale
              accessibilityLabel={`Note de ${note.authorName} sur ${note.lessonTitle}`}
              onPress={() =>
                router.push({ pathname: "/notes/received/[noteId]", params: { noteId: note.id } })
              }
              style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 14 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tint }} />
                <Text variant="micro" style={{ color: tint }}>
                  {category ? CATEGORY_LABEL[category] : "-"}
                </Text>
              </View>
              <Text variant="h3" numberOfLines={1}>
                {note.lessonTitle}
              </Text>
              <Text variant="bodySm" numberOfLines={2}>
                {noteExcerpt(note.content) || "Note vide"}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Text
                  variant="micro"
                  numberOfLines={1}
                  style={{ flex: 1, color: colors.textSecondary }}
                >
                  {note.authorName}
                </Text>
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  {timeAgo(note.sharedAt, now)}
                </Text>
              </View>
            </PressableScale>
          </Card>
        );
      })}
    </View>
  );
}
