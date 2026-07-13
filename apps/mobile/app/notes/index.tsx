import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { ActionChip, BackButton } from "@/components/buttons";
import { FOLDER_ICON_NAMES, FolderGlyph } from "@/components/folder-icons";
import { ChevronRight } from "@/components/icons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, SectionLabel, Text } from "@/components/ui";
import { CATEGORY_COLOR } from "@/lib/db";
import {
  createNoteFolder,
  deleteNoteFolder,
  moveNoteToFolder,
  updateNoteFolder,
  useNotes,
  type NoteFolderItem,
  type NoteItem,
} from "@/lib/queries";
import { useSession } from "@/lib/session";

const FOLDER_COLORS = ["#0AFFD4", "#6E8BFF", "#FF4757", "#FFB020", "#B983FF", "#4D8BFF"] as const;

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

interface FolderDraft {
  id: string | null;
  name: string;
  color: string;
  icon: string;
}

export default function Notes(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useNotes(userId);

  // draft: null = closed; id null = create mode; id set = edit mode.
  const [draft, setDraft] = useState<FolderDraft | null>(null);
  const [movingNote, setMovingNote] = useState<NoteItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NoteFolderItem | null>(null);

  const folders = data?.folders ?? [];
  const notes = data?.notes ?? [];
  const byFolder = new Map<string | null, NoteItem[]>();
  for (const n of notes) {
    const list = byFolder.get(n.folderId) ?? [];
    list.push(n);
    byFolder.set(n.folderId, list);
  }
  const unfiled = byFolder.get(null) ?? [];

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["notes", userId] });
  };

  async function saveDraft(): Promise<void> {
    if (!userId || !draft || draft.name.trim() === "") return;
    if (draft.id === null) {
      await createNoteFolder(userId, draft.name.trim(), draft.color, draft.icon, folders.length);
    } else {
      await updateNoteFolder(draft.id, {
        name: draft.name.trim(),
        color: draft.color,
        icon: draft.icon,
      });
    }
    setDraft(null);
    await invalidate();
  }

  async function removeFolder(folder: NoteFolderItem): Promise<void> {
    await deleteNoteFolder(folder.id);
    setConfirmDelete(null);
    setDraft(null);
    await invalidate();
  }

  async function moveTo(folderId: string | null): Promise<void> {
    if (!movingNote) return;
    await moveNoteToFolder(movingNote.id, folderId);
    setMovingNote(null);
    await invalidate();
  }

  const openNote = (n: NoteItem): void => {
    router.push({
      pathname: "/notes/[lessonId]",
      params: { lessonId: n.lessonId, title: n.lessonTitle },
    });
  };

  return (
    <Screen onRefresh={() => refetch()}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <BackButton />
        <ActionChip
          label="+ Dossier"
          onPress={() => setDraft({ id: null, name: "", color: FOLDER_COLORS[0], icon: "folder" })}
        />
      </View>

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
      ) : notes.length === 0 && folders.length === 0 ? (
        <EmptyState
          title="Aucune note"
          body="Ouvre une leçon et appuie sur « Notes » pour garder tes idées au chaud."
        />
      ) : (
        <View style={{ gap: 22 }}>
          {folders.map((f) => {
            const items = byFolder.get(f.id) ?? [];
            const tint = f.color ?? colors.accent;
            return (
              <View key={f.id}>
                {/* Folder header: tap = rename / recolor / delete */}
                <PressableScale
                  accessibilityLabel={`Modifier le dossier ${f.name}`}
                  onPress={() =>
                    setDraft({
                      id: f.id,
                      name: f.name,
                      color: f.color ?? FOLDER_COLORS[0],
                      icon: f.icon ?? "folder",
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                    paddingVertical: 4,
                  }}
                >
                  <FolderGlyph name={f.icon} color={tint} size={16} />
                  <Text variant="micro" style={{ color: tint, letterSpacing: 1.5, flex: 1 }}>
                    {f.name} · {items.length}
                  </Text>
                  <Text variant="micro" style={{ color: colors.textDisabled }}>
                    modifier ✎
                  </Text>
                </PressableScale>
                {items.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    {items.map((n) => (
                      <NoteCard
                        key={n.id}
                        note={n}
                        folder={f}
                        onPress={() => openNote(n)}
                        onMove={() => setMovingNote(n)}
                      />
                    ))}
                  </View>
                ) : (
                  <Text variant="micro" style={{ color: colors.textDisabled, marginLeft: 24 }}>
                    Dossier vide · range une note ici via sa pastille
                  </Text>
                )}
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
                  <NoteCard
                    key={n.id}
                    note={n}
                    folder={null}
                    onPress={() => openNote(n)}
                    onMove={() => setMovingNote(n)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}

      {/* Folder create / edit modal */}
      <Modal visible={draft !== null} transparent animationType="fade">
        <View style={modalBackdrop}>
          <View style={modalCard}>
            <Text variant="h2" style={{ marginBottom: 4 }}>
              {draft?.id ? "Modifier le dossier" : "Nouveau dossier"}
            </Text>
            <TextInput
              value={draft?.name ?? ""}
              onChangeText={(t) => setDraft((d) => (d ? { ...d, name: t } : d))}
              placeholder="Nom du dossier…"
              placeholderTextColor={colors.textDisabled}
              maxLength={40}
              style={{
                height: 44,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                backgroundColor: "rgba(5,4,26,0.6)",
                color: colors.textPrimary,
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 13,
                paddingHorizontal: 12,
                borderRadius: 8,
              }}
            />

            <Text variant="micro" style={{ marginTop: 6 }}>
              Couleur
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {FOLDER_COLORS.map((c) => (
                <PressableScale
                  key={c}
                  accessibilityLabel={`Couleur ${c}`}
                  onPress={() => setDraft((d) => (d ? { ...d, color: c } : d))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: `${c}2A`,
                    borderWidth: draft?.color === c ? 2 : 1,
                    borderColor: draft?.color === c ? c : colors.borderDefault,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c }} />
                </PressableScale>
              ))}
            </View>

            <Text variant="micro" style={{ marginTop: 6 }}>
              Icône
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {FOLDER_ICON_NAMES.map((name) => (
                <PressableScale
                  key={name}
                  accessibilityLabel={`Icône ${name}`}
                  onPress={() => setDraft((d) => (d ? { ...d, icon: name } : d))}
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: draft?.icon === name ? draft.color : colors.borderDefault,
                    backgroundColor: draft?.icon === name ? `${draft.color}14` : "rgba(5,4,26,0.5)",
                  }}
                >
                  <FolderGlyph name={name} color={draft?.color ?? colors.accent} size={18} />
                </PressableScale>
              ))}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14, alignItems: "center" }}>
              <ActionChip label="Annuler" tone="neutral" onPress={() => setDraft(null)} />
              {draft?.id ? (
                <ActionChip
                  label="Supprimer"
                  tone="danger"
                  onPress={() => {
                    const f = folders.find((x) => x.id === draft.id);
                    if (f) setConfirmDelete(f);
                  }}
                />
              ) : null}
              <View style={{ flex: 1 }} />
              <PressableScale
                onPress={() => void saveDraft()}
                disabled={!draft || draft.name.trim() === ""}
                style={{
                  paddingHorizontal: 20,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    draft && draft.name.trim() !== "" ? colors.accent : colors.bgOverlay,
                  borderRadius: 8,
                }}
              >
                <Text
                  variant="micro"
                  style={{
                    color: draft && draft.name.trim() !== "" ? colors.bgBase : colors.textMuted,
                  }}
                >
                  {draft?.id ? "Enregistrer" : "Créer"}
                </Text>
              </PressableScale>
            </View>

            {confirmDelete ? (
              <View
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,77,109,0.5)",
                  borderRadius: 8,
                  padding: 12,
                  gap: 10,
                }}
              >
                <Text variant="bodySm">
                  Supprimer « {confirmDelete.name} » ? Les notes qu'il contient repassent en « Sans
                  dossier ».
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <ActionChip
                    label="Annuler"
                    tone="neutral"
                    onPress={() => setConfirmDelete(null)}
                  />
                  <ActionChip
                    label="Supprimer définitivement"
                    tone="danger"
                    onPress={() => void removeFolder(confirmDelete)}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Move-note modal */}
      <Modal visible={movingNote !== null} transparent animationType="fade">
        <View style={modalBackdrop}>
          <View style={modalCard}>
            <Text variant="h2">Ranger la note</Text>
            <Text variant="bodySm" numberOfLines={1} style={{ marginBottom: 6 }}>
              {movingNote?.lessonTitle}
            </Text>
            <View style={{ gap: 8 }}>
              {folders.map((f) => (
                <PressableScale
                  key={f.id}
                  accessibilityLabel={`Déplacer vers ${f.name}`}
                  onPress={() => void moveTo(f.id)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor:
                      movingNote?.folderId === f.id
                        ? (f.color ?? colors.accent)
                        : colors.borderDefault,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                  }}
                >
                  <FolderGlyph name={f.icon} color={f.color ?? colors.accent} size={16} />
                  <Text variant="h3" style={{ flex: 1, fontSize: 13.5 }}>
                    {f.name}
                  </Text>
                  {movingNote?.folderId === f.id ? (
                    <Text variant="micro" style={{ color: f.color ?? colors.accent }}>
                      actuel
                    </Text>
                  ) : null}
                </PressableScale>
              ))}
              <PressableScale
                accessibilityLabel="Retirer du dossier"
                onPress={() => void moveTo(null)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: colors.borderDefault,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                }}
              >
                <Text variant="h3" style={{ flex: 1, fontSize: 13.5, color: colors.textSecondary }}>
                  Sans dossier
                </Text>
                {movingNote?.folderId === null ? <Text variant="micro">actuel</Text> : null}
              </PressableScale>
            </View>
            <View style={{ alignItems: "flex-end", marginTop: 12 }}>
              <ActionChip label="Fermer" tone="neutral" onPress={() => setMovingNote(null)} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function NoteCard({
  note,
  folder,
  onPress,
  onMove,
}: {
  note: NoteItem;
  folder: NoteFolderItem | null;
  onPress: () => void;
  onMove: () => void;
}): React.JSX.Element {
  return (
    <PressableScale onPress={onPress} onLongPress={onMove}>
      <Card
        accent={CATEGORY_COLOR[note.category]}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="h3" numberOfLines={1}>
            {note.lessonTitle}
          </Text>
          <Text variant="bodySm" numberOfLines={2}>
            {excerpt(note.content)}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 10,
                color: colors.textDisabled,
              }}
            >
              {note.wordCount} mots · {fmtDate(note.updatedAt)}
            </Text>
            {/* Folder chip: tap to (re)file the note */}
            <PressableScale
              accessibilityLabel="Ranger dans un dossier"
              onPress={onMove}
              hitSlop={6}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                borderWidth: 1,
                borderColor: folder ? `${folder.color ?? colors.accent}66` : colors.borderDefault,
                borderRadius: 999,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <FolderGlyph
                name={folder?.icon ?? "folder"}
                color={folder?.color ?? colors.textMuted}
                size={10}
              />
              <Text
                variant="micro"
                style={{ color: folder?.color ?? colors.textMuted, fontSize: 9 }}
              >
                {folder ? folder.name : "Ranger"}
              </Text>
            </PressableScale>
          </View>
        </View>
        <ChevronRight color={colors.textMuted} size={15} />
      </Card>
    </PressableScale>
  );
}

const modalBackdrop = {
  flex: 1,
  backgroundColor: "rgba(2,1,14,0.85)",
  justifyContent: "center" as const,
  padding: 22,
};

const modalCard = {
  backgroundColor: colors.bgElevated,
  borderWidth: 1,
  borderColor: colors.borderDefault,
  borderRadius: 14,
  padding: 18,
  gap: 10,
};
