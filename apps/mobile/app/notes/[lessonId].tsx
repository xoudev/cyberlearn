import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui";
import { fetchNoteForLesson, saveNoteForLesson } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function NoteEditor(): React.JSX.Element {
  const router = useRouter();
  const { lessonId, title } = useLocalSearchParams<{ lessonId: string; title?: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const [content, setContent] = useState<string | null>(null); // null = loading
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!userId || !lessonId) return;
    void fetchNoteForLesson(userId, lessonId).then((note) => {
      setContent(note?.content ?? "");
    });
  }, [userId, lessonId]);

  async function save(): Promise<void> {
    if (!userId || !lessonId || content === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveNoteForLesson(userId, lessonId, content);
    } catch {
      setSaving(false);
      setSaveError("Enregistrement impossible. Réessaie.");
      return;
    }
    setSaving(false);
    setSavedAt(Date.now());
    dirty.current = false;
    void queryClient.invalidateQueries({ queryKey: ["notes", userId] });
  }

  const words = content && content.trim() !== "" ? content.trim().split(/\s+/).length : 0;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <Text variant="micro">← Retour</Text>
          </Pressable>
          <Text variant="micro" style={{ color: saveError ? colors.danger : colors.textMuted }}>
            {saveError ??
              `${String(words)} mots${savedAt && !dirty.current ? " · enregistré ✓" : ""}`}
          </Text>
        </View>

        <Text variant="micro" style={{ color: colors.accent, marginBottom: 4 }}>
          Note de leçon
        </Text>
        <Text variant="h2" numberOfLines={2} style={{ marginBottom: 12 }}>
          {title ?? "Ma note"}
        </Text>

        {content === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        ) : (
          <>
            <TextInput
              value={content}
              onChangeText={(t) => {
                setContent(t);
                dirty.current = true;
              }}
              multiline
              textAlignVertical="top"
              placeholder="Tape tes notes ici… (markdown bienvenu)"
              placeholderTextColor={colors.textDisabled}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                backgroundColor: "rgba(5,4,26,0.6)",
                color: colors.textPrimary,
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 13,
                lineHeight: 20,
                padding: 14,
              }}
            />
            <PressableScale
              onPress={() => void save()}
              disabled={saving}
              style={{
                marginTop: 12,
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
              }}
            >
              {saving ? (
                <ActivityIndicator color={colors.bgBase} />
              ) : (
                <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
                  Enregistrer
                </Text>
              )}
            </PressableScale>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
