import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  RefreshControl,
  ScrollView as NativeScrollView,
  TextInput,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  type NativeGesture,
  type PanGesture,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { colors, fonts, radius } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { AppModal } from "@/components/app-modal";
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

// Drop-zone key: a folder id, or "__unfiled__" for the no-folder section.
const UNFILED_KEY = "__unfiled__";
const AUTO_SCROLL_EDGE_SIZE = 72;
const AUTO_SCROLL_STEP = 12;

interface NotesData {
  folders: NoteFolderItem[];
  notes: NoteItem[];
}

interface NoteDragGestures {
  card: PanGesture;
  handle: PanGesture;
}

/**
 * Long-press then drag a note card; the card follows the finger and the parent
 * is told where it hovers/drops (window coordinates, like measureInWindow).
 */
function DraggableNote({
  noteId,
  disabled,
  scrollGesture,
  scrollCompensation,
  onDragPrepare,
  onDragStart,
  onHoverAt,
  onDropAt,
  onDragFinish,
  children,
}: {
  noteId: string;
  disabled: boolean;
  scrollGesture: NativeGesture;
  scrollCompensation: SharedValue<number>;
  onDragPrepare: () => void;
  onDragStart: (noteId: string) => void;
  onHoverAt: (y: number) => void;
  onDropAt: (noteId: string, y: number) => void;
  onDragFinish: (noteId: string) => void;
  children: (dragGestures: NoteDragGestures) => React.ReactNode;
}): React.JSX.Element {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const active = useSharedValue(0);

  const dragGestures = useMemo(() => {
    const configure = (gesture: PanGesture): PanGesture =>
      gesture
        .enabled(!disabled)
        .maxPointers(1)
        .shouldCancelWhenOutside(false)
        .blocksExternalGesture(scrollGesture)
        .onBegin(() => {
          "worklet";
          runOnJS(onDragPrepare)();
        })
        .onStart(() => {
          "worklet";
          active.value = 1;
          runOnJS(onDragStart)(noteId);
        })
        .onUpdate((event) => {
          "worklet";
          tx.value = event.translationX;
          ty.value = event.translationY;
          runOnJS(onHoverAt)(event.absoluteY);
        })
        .onEnd((event, success) => {
          "worklet";
          if (success) runOnJS(onDropAt)(noteId, event.absoluteY);
          runOnJS(onDragFinish)(noteId);
        })
        .onFinalize(() => {
          "worklet";
          active.value = 0;
          tx.value = 0;
          ty.value = 0;
        });

    return {
      card: configure(Gesture.Pan().activateAfterLongPress(250)),
      handle: configure(Gesture.Pan().minDistance(1)),
    };
  }, [
    active,
    disabled,
    noteId,
    onDragFinish,
    onDragPrepare,
    onDragStart,
    onDropAt,
    onHoverAt,
    scrollGesture,
    tx,
    ty,
  ]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value + scrollCompensation.value * active.value },
    ],
    zIndex: active.value > 0 ? 100 : 0,
    elevation: active.value > 0 ? 10 : 0,
  }));

  return <Animated.View style={style}>{children(dragGestures)}</Animated.View>;
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
  const [mutError, setMutError] = useState<string | null>(null);
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [pendingMoveId, setPendingMoveId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const pendingMoveRef = useRef(false);

  const folders = data?.folders ?? [];
  const notes = data?.notes ?? [];
  const byFolder = new Map<string | null, NoteItem[]>();
  for (const n of notes) {
    const list = byFolder.get(n.folderId) ?? [];
    list.push(n);
    byFolder.set(n.folderId, list);
  }
  const unfiled = byFolder.get(null) ?? [];

  const invalidate = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ["notes", userId] });
  }, [queryClient, userId]);

  const moveNote = useCallback(
    async (noteId: string, folderId: string | null): Promise<boolean> => {
      if (pendingMoveRef.current) return false;
      pendingMoveRef.current = true;

      const queryKey = ["notes", userId];
      const cancellation = queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<NotesData>(queryKey);

      setMutError(null);
      setPendingMoveId(noteId);
      queryClient.setQueryData<NotesData>(queryKey, (current) =>
        current
          ? {
              ...current,
              notes: current.notes.map((note) =>
                note.id === noteId ? { ...note, folderId } : note,
              ),
            }
          : current,
      );

      try {
        await cancellation;
        await moveNoteToFolder(noteId, folderId);
      } catch {
        if (previousData) queryClient.setQueryData(queryKey, previousData);
        setMutError("Déplacement impossible. Vérifie ta connexion.");
        return false;
      } finally {
        try {
          await invalidate();
        } finally {
          pendingMoveRef.current = false;
          setPendingMoveId((current) => (current === noteId ? null : current));
        }
      }

      return true;
    },
    [invalidate, queryClient, userId],
  );

  async function saveDraft(): Promise<void> {
    if (!userId || !draft || draft.name.trim() === "") return;
    try {
      if (draft.id === null) {
        await createNoteFolder(userId, draft.name.trim(), draft.color, draft.icon, folders.length);
      } else {
        await updateNoteFolder(draft.id, {
          name: draft.name.trim(),
          color: draft.color,
          icon: draft.icon,
        });
      }
    } catch {
      setMutError("Enregistrement impossible. Vérifie ta connexion.");
      return;
    }
    setMutError(null);
    setDraft(null);
    await invalidate();
  }

  async function removeFolder(folder: NoteFolderItem): Promise<void> {
    try {
      await deleteNoteFolder(folder.id);
    } catch {
      setMutError("Suppression impossible. Vérifie ta connexion.");
      return;
    }
    setMutError(null);
    setConfirmDelete(null);
    setDraft(null);
    await invalidate();
  }

  async function moveTo(folderId: string | null): Promise<void> {
    if (!movingNote) return;
    const moved = await moveNote(movingNote.id, folderId);
    if (moved) setMovingNote(null);
  }

  const openNote = (n: NoteItem): void => {
    router.push({
      pathname: "/notes/[lessonId]",
      params: { lessonId: n.lessonId, title: n.lessonTitle },
    });
  };

  // ── Drag and drop: folder sections are drop zones ───────────────────────────
  const zoneRefs = useRef(new Map<string, View>());
  const zoneRects = useRef(new Map<string, { y1: number; y2: number }>());
  const zoneRefCallbacks = useRef(new Map<string, (node: View | null) => void>());
  const measurementGeneration = useRef(0);
  const scrollRef = useRef<NativeScrollView>(null);
  const scrollOffsetY = useRef(0);
  const scrollViewportHeight = useRef(0);
  const scrollContentHeight = useRef(0);
  const scrollViewportRect = useRef<{ y1: number; y2: number } | null>(null);
  const autoScrollDirection = useRef<-1 | 0 | 1>(0);
  const scrollCommandPending = useRef(false);
  const autoScrollFrame = useRef<number | null>(null);
  const autoScrollLoopRef = useRef<() => void>(() => undefined);
  const dragActive = useRef(false);
  const dragScrollCompensation = useSharedValue(0);
  const scrollGesture = useMemo(() => Gesture.Native(), []);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const lastHover = useRef<string | null>(null);
  const lastPointerY = useRef<number | null>(null);

  const setZoneRef = useCallback((key: string): ((node: View | null) => void) => {
    const cached = zoneRefCallbacks.current.get(key);
    if (cached) return cached;

    const callback = (node: View | null): void => {
      if (node) {
        zoneRefs.current.set(key, node);
        return;
      }
      measurementGeneration.current += 1;
      zoneRefs.current.delete(key);
      zoneRects.current.delete(key);
      zoneRefCallbacks.current.delete(key);
    };
    zoneRefCallbacks.current.set(key, callback);
    return callback;
  }, []);

  const measureZones = useCallback((): void => {
    const generation = measurementGeneration.current + 1;
    measurementGeneration.current = generation;
    const entries = [...zoneRefs.current.entries()];
    if (entries.length === 0) {
      zoneRects.current = new Map<string, { y1: number; y2: number }>();
      return;
    }

    const nextRects = new Map<string, { y1: number; y2: number }>();
    let remaining = entries.length;
    for (const [key, node] of entries) {
      node.measureInWindow((_x, y, _w, h) => {
        nextRects.set(key, { y1: y, y2: y + h });
        remaining -= 1;
        if (remaining === 0 && measurementGeneration.current === generation) {
          zoneRects.current = nextRects;
        }
      });
    }
  }, []);

  const zoneAt = useCallback((y: number): string | null => {
    for (const [key, rect] of zoneRects.current) {
      if (y >= rect.y1 && y <= rect.y2) return key;
    }
    return null;
  }, []);

  const updateHoveredZone = useCallback(
    (y: number): void => {
      const key = zoneAt(y);
      if (key !== lastHover.current) {
        lastHover.current = key;
        setHoverKey(key);
      }
    },
    [zoneAt],
  );

  const translateZoneRects = useCallback((scrollDelta: number): void => {
    if (scrollDelta === 0) return;
    const nextRects = new Map<string, { y1: number; y2: number }>();
    for (const [key, rect] of zoneRects.current) {
      nextRects.set(key, {
        y1: rect.y1 - scrollDelta,
        y2: rect.y2 - scrollDelta,
      });
    }
    zoneRects.current = nextRects;
  }, []);

  const measureScrollViewport = useCallback((): void => {
    scrollRef.current?.getNativeScrollRef()?.measureInWindow((_x, y, _width, height) => {
      scrollViewportHeight.current = height;
      scrollViewportRect.current = { y1: y, y2: y + height };
    });
  }, []);

  const stopAutoScroll = useCallback((): void => {
    autoScrollDirection.current = 0;
    if (autoScrollFrame.current !== null) {
      cancelAnimationFrame(autoScrollFrame.current);
      autoScrollFrame.current = null;
    }
  }, []);

  const runAutoScroll = useCallback((): void => {
    autoScrollFrame.current = null;
    const direction = autoScrollDirection.current;
    if (direction === 0 || scrollCommandPending.current) return;

    const maxOffset = Math.max(0, scrollContentHeight.current - scrollViewportHeight.current);
    const nextOffset = Math.min(
      maxOffset,
      Math.max(0, scrollOffsetY.current + direction * AUTO_SCROLL_STEP),
    );
    if (nextOffset === scrollOffsetY.current) {
      autoScrollDirection.current = 0;
      return;
    }

    scrollCommandPending.current = true;
    scrollRef.current?.scrollTo({ y: nextOffset, animated: false });
  }, []);
  autoScrollLoopRef.current = runAutoScroll;

  const updateAutoScroll = useCallback(
    (absoluteY: number): void => {
      const viewport = scrollViewportRect.current;
      if (!viewport) {
        stopAutoScroll();
        return;
      }

      let direction: -1 | 0 | 1 = 0;
      if (absoluteY <= viewport.y1 + AUTO_SCROLL_EDGE_SIZE) direction = -1;
      if (absoluteY >= viewport.y2 - AUTO_SCROLL_EDGE_SIZE) direction = 1;
      autoScrollDirection.current = direction;

      if (direction === 0) {
        stopAutoScroll();
      } else if (autoScrollFrame.current === null && !scrollCommandPending.current) {
        autoScrollFrame.current = requestAnimationFrame(autoScrollLoopRef.current);
      }
    },
    [stopAutoScroll],
  );

  useEffect(
    () => () => {
      stopAutoScroll();
    },
    [stopAutoScroll],
  );

  const handleDragStart = useCallback((noteId: string): void => {
    dragActive.current = true;
    setDraggingNoteId(noteId);
  }, []);

  const handleDragPrepare = useCallback((): void => {
    dragScrollCompensation.value = 0;
    scrollCommandPending.current = false;
    lastPointerY.current = null;
    measureScrollViewport();
    measureZones();
  }, [dragScrollCompensation, measureScrollViewport, measureZones]);

  const handleDragFinish = useCallback(
    (noteId: string): void => {
      stopAutoScroll();
      dragActive.current = false;
      setDraggingNoteId((current) => (current === noteId ? null : current));
      lastHover.current = null;
      lastPointerY.current = null;
      setHoverKey(null);
    },
    [stopAutoScroll],
  );

  const handleHoverAt = useCallback(
    (y: number): void => {
      lastPointerY.current = y;
      updateAutoScroll(y);
      updateHoveredZone(y);
    },
    [updateAutoScroll, updateHoveredZone],
  );

  const handleDropAt = useCallback(
    (noteId: string, y: number): void => {
      stopAutoScroll();
      lastHover.current = null;
      setHoverKey(null);
      const key = zoneAt(y);
      if (key === null) return;
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      const targetFolderId = key === UNFILED_KEY ? null : key;
      if (targetFolderId === note.folderId) return;
      void moveNote(noteId, targetFolderId);
    },
    [moveNote, notes, stopAutoScroll, zoneAt],
  );

  const handleScrollLayout = useCallback(
    (event: LayoutChangeEvent): void => {
      scrollViewportHeight.current = event.nativeEvent.layout.height;
      measureScrollViewport();
      measureZones();
    },
    [measureScrollViewport, measureZones],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const nextOffset = event.nativeEvent.contentOffset.y;
      const scrollDelta = nextOffset - scrollOffsetY.current;
      translateZoneRects(scrollDelta);
      if (dragActive.current) dragScrollCompensation.value += scrollDelta;
      scrollOffsetY.current = nextOffset;
      scrollCommandPending.current = false;
      if (lastPointerY.current !== null) updateHoveredZone(lastPointerY.current);
      if (autoScrollDirection.current !== 0 && autoScrollFrame.current === null) {
        autoScrollFrame.current = requestAnimationFrame(autoScrollLoopRef.current);
      }
    },
    [dragScrollCompensation, translateZoneRects, updateHoveredZone],
  );

  const handleContentSizeChange = useCallback(
    (_width: number, height: number): void => {
      scrollContentHeight.current = height;
      measureZones();
    },
    [measureZones],
  );

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const screenError =
    mutError ?? (error && data ? "Actualisation impossible. Vérifie ta connexion." : null);
  const showScreenError = screenError !== null && draft === null && movingNote === null;

  return (
    <Screen scroll={false}>
      <GestureDetector gesture={scrollGesture}>
        <NativeScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: showScreenError ? 110 : 34 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          scrollEnabled={draggingNoteId === null}
          scrollEventThrottle={16}
          onLayout={handleScrollLayout}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onMomentumScrollEnd={measureZones}
          onScrollEndDrag={measureZones}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.bgElevated}
            />
          }
        >
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
              onPress={() => {
                setMutError(null);
                setDraft({ id: null, name: "", color: FOLDER_COLORS[0], icon: "folder" });
              }}
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
          ) : error && !data ? (
            <ErrorState onRetry={() => void refetch()} code="NOTES_LOAD" />
          ) : notes.length === 0 && folders.length === 0 ? (
            <EmptyState
              title="Aucune note"
              body="Ouvre une leçon et appuie sur « Notes » pour garder tes idées au chaud."
            />
          ) : (
            <View style={{ gap: 22 }}>
              {notes.length > 0 && folders.length > 0 ? (
                <Text variant="micro" style={{ color: colors.textDisabled }}>
                  Astuce : attrape la poignée à six points pour déplacer une note.
                </Text>
              ) : null}
              {folders.map((f) => {
                const items = byFolder.get(f.id) ?? [];
                const tint = f.color ?? colors.accent;
                const hovered = hoverKey === f.id;
                const isDragSource = items.some((note) => note.id === draggingNoteId);
                return (
                  <View
                    key={f.id}
                    ref={setZoneRef(f.id)}
                    collapsable={false}
                    onLayout={measureZones}
                    style={{
                      backgroundColor: hovered ? `${tint}14` : "transparent",
                      borderWidth: 1,
                      borderColor: hovered ? tint : "transparent",
                      padding: 6,
                      margin: -7,
                      minHeight: items.length === 0 ? 72 : 0,
                      zIndex: isDragSource ? 50 : 0,
                      elevation: isDragSource ? 10 : 0,
                    }}
                  >
                    {/* Folder header: tap = rename / recolor / delete */}
                    <PressableScale
                      accessibilityLabel={`Modifier le dossier ${f.name}`}
                      onPress={() => {
                        setMutError(null);
                        setDraft({
                          id: f.id,
                          name: f.name,
                          color: f.color ?? FOLDER_COLORS[0],
                          icon: f.icon ?? "folder",
                        });
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                        minHeight: 44,
                        paddingHorizontal: 4,
                      }}
                    >
                      <FolderGlyph name={f.icon} color={tint} size={16} />
                      <Text variant="micro" style={{ color: tint, letterSpacing: 1.5, flex: 1 }}>
                        {f.name} · {items.length}
                        {hovered ? "  ← déposer ici" : ""}
                      </Text>
                      <Text variant="micro" style={{ color: colors.textDisabled }}>
                        modifier ✎
                      </Text>
                    </PressableScale>
                    {items.length > 0 ? (
                      <View style={{ gap: 10 }}>
                        {items.map((n) => (
                          <DraggableNote
                            key={n.id}
                            noteId={n.id}
                            disabled={
                              pendingMoveId !== null ||
                              (draggingNoteId !== null && draggingNoteId !== n.id)
                            }
                            scrollGesture={scrollGesture}
                            scrollCompensation={dragScrollCompensation}
                            onDragPrepare={handleDragPrepare}
                            onDragStart={handleDragStart}
                            onHoverAt={handleHoverAt}
                            onDropAt={handleDropAt}
                            onDragFinish={handleDragFinish}
                          >
                            {(dragGestures) => (
                              <NoteCard
                                note={n}
                                folder={f}
                                cardDragGesture={dragGestures.card}
                                handleDragGesture={dragGestures.handle}
                                moveDisabled={pendingMoveId !== null}
                                movePending={pendingMoveId === n.id}
                                onPress={() => openNote(n)}
                                onMove={() => {
                                  setMutError(null);
                                  setMovingNote(n);
                                }}
                              />
                            )}
                          </DraggableNote>
                        ))}
                      </View>
                    ) : (
                      <Text variant="micro" style={{ color: colors.textDisabled, marginLeft: 24 }}>
                        Dossier vide · glisse une note ici
                      </Text>
                    )}
                  </View>
                );
              })}

              {unfiled.length > 0 || (folders.length > 0 && notes.length > 0) ? (
                <View
                  ref={setZoneRef(UNFILED_KEY)}
                  collapsable={false}
                  onLayout={measureZones}
                  style={{
                    backgroundColor:
                      hoverKey === UNFILED_KEY ? "rgba(184,181,209,0.08)" : "transparent",
                    borderWidth: 1,
                    borderColor: hoverKey === UNFILED_KEY ? colors.textMuted : "transparent",
                    padding: 6,
                    margin: -7,
                    minHeight: unfiled.length === 0 ? 72 : 0,
                    zIndex: unfiled.some((note) => note.id === draggingNoteId) ? 50 : 0,
                    elevation: unfiled.some((note) => note.id === draggingNoteId) ? 10 : 0,
                  }}
                >
                  {folders.length > 0 ? (
                    <Text variant="micro" style={{ marginBottom: 10, letterSpacing: 1.5 }}>
                      Sans dossier · {unfiled.length}
                      {hoverKey === UNFILED_KEY ? "  ← déposer ici" : ""}
                    </Text>
                  ) : null}
                  <View style={{ gap: 10 }}>
                    {unfiled.map((n) => (
                      <DraggableNote
                        key={n.id}
                        noteId={n.id}
                        disabled={
                          pendingMoveId !== null ||
                          (draggingNoteId !== null && draggingNoteId !== n.id)
                        }
                        scrollGesture={scrollGesture}
                        scrollCompensation={dragScrollCompensation}
                        onDragPrepare={handleDragPrepare}
                        onDragStart={handleDragStart}
                        onHoverAt={handleHoverAt}
                        onDropAt={handleDropAt}
                        onDragFinish={handleDragFinish}
                      >
                        {(dragGestures) => (
                          <NoteCard
                            note={n}
                            folder={null}
                            cardDragGesture={dragGestures.card}
                            handleDragGesture={dragGestures.handle}
                            moveDisabled={pendingMoveId !== null}
                            movePending={pendingMoveId === n.id}
                            onPress={() => openNote(n)}
                            onMove={() => {
                              setMutError(null);
                              setMovingNote(n);
                            }}
                          />
                        )}
                      </DraggableNote>
                    ))}
                    {unfiled.length === 0 ? (
                      <Text variant="micro" style={{ color: colors.textDisabled, marginLeft: 24 }}>
                        Zone vide · glisse une note ici pour la sortir de son dossier
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
            </View>
          )}
        </NativeScrollView>
      </GestureDetector>

      {showScreenError ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 12,
            zIndex: 200,
            borderWidth: 1,
            borderColor: colors.danger,
            backgroundColor: colors.bgElevated,
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <Text
            variant="bodySm"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger }}
          >
            {screenError}
          </Text>
        </View>
      ) : null}

      {/* Folder create / edit modal */}
      <AppModal
        visible={draft !== null}
        scroll
        onClose={() => {
          setConfirmDelete(null);
          setDraft(null);
        }}
      >
        <Text variant="h2" style={{ marginBottom: 4 }}>
          {draft?.id ? "Modifier le dossier" : "Nouveau dossier"}
        </Text>
        {mutError ? (
          <Text
            variant="bodySm"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger }}
          >
            {mutError}
          </Text>
        ) : null}
        <TextInput
          value={draft?.name ?? ""}
          onChangeText={(t) => setDraft((d) => (d ? { ...d, name: t } : d))}
          placeholder="Nom du dossier…"
          placeholderTextColor={colors.textDisabled}
          maxLength={40}
          style={{
            height: 48,
            borderRadius: radius.sm,
            backgroundColor: colors.bgOverlay,
            color: colors.textPrimary,
            fontFamily: `${fonts.mono}_400Regular`,
            fontSize: 13,
            paddingHorizontal: 14,
          }}
        />

        <Text variant="micro" style={{ marginTop: 4 }}>
          Couleur
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {FOLDER_COLORS.map((c) => (
            <PressableScale
              key={c}
              accessibilityLabel={`Couleur ${c}`}
              accessibilityState={{ selected: draft?.color === c }}
              onPress={() => setDraft((d) => (d ? { ...d, color: c } : d))}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: draft?.color === c ? `${c}30` : colors.bgOverlay,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c }} />
            </PressableScale>
          ))}
        </View>

        <Text variant="micro" style={{ marginTop: 4 }}>
          Icône
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {FOLDER_ICON_NAMES.map((name) => (
            <PressableScale
              key={name}
              accessibilityLabel={`Icône ${name}`}
              accessibilityState={{ selected: draft?.icon === name }}
              onPress={() => setDraft((d) => (d ? { ...d, icon: name } : d))}
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.sm,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: draft?.icon === name ? `${draft.color}18` : colors.bgOverlay,
              }}
            >
              <FolderGlyph name={name} color={draft?.color ?? colors.accent} size={18} />
            </PressableScale>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" }}>
          <ActionChip label="Annuler" tone="neutral" onPress={() => setDraft(null)} />
          {draft?.id ? (
            <ActionChip
              label="Supprimer"
              tone="danger"
              onPress={() => {
                const folder = folders.find((item) => item.id === draft.id);
                if (folder) setConfirmDelete(folder);
              }}
            />
          ) : null}
          <View style={{ flex: 1 }} />
          <PressableScale
            onPress={() => void saveDraft()}
            disabled={!draft || draft.name.trim() === ""}
            style={{
              paddingHorizontal: 20,
              minHeight: 44,
              borderRadius: radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: draft && draft.name.trim() !== "" ? colors.accent : colors.bgOverlay,
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
              marginTop: 8,
              borderRadius: radius.sm,
              backgroundColor: "rgba(255,77,109,0.1)",
              padding: 14,
              gap: 12,
            }}
          >
            <Text variant="bodySm">
              Supprimer « {confirmDelete.name} » ? Les notes qu'il contient repassent en « Sans
              dossier ».
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <ActionChip label="Annuler" tone="neutral" onPress={() => setConfirmDelete(null)} />
              <ActionChip
                label="Supprimer définitivement"
                tone="danger"
                onPress={() => void removeFolder(confirmDelete)}
              />
            </View>
          </View>
        ) : null}
      </AppModal>

      {/* Move-note modal */}
      <AppModal
        visible={movingNote !== null}
        closeDisabled={pendingMoveId !== null}
        onClose={() => {
          if (pendingMoveId === null) setMovingNote(null);
        }}
      >
        <Text variant="h2">Ranger la note</Text>
        {mutError ? (
          <Text
            variant="bodySm"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger }}
          >
            {mutError}
          </Text>
        ) : null}
        <Text variant="bodySm" numberOfLines={1} style={{ marginBottom: 6 }}>
          {movingNote?.lessonTitle}
        </Text>
        {pendingMoveId !== null ? (
          <Text variant="micro" accessibilityLiveRegion="polite" style={{ color: colors.accent }}>
            Rangement en cours…
          </Text>
        ) : null}
        <NativeScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 8 }}>
          {folders.map((folder) => (
            <PressableScale
              key={folder.id}
              accessibilityLabel={`Déplacer vers ${folder.name}`}
              accessibilityState={{
                selected: movingNote?.folderId === folder.id,
                disabled: pendingMoveId !== null,
              }}
              onPress={() => void moveTo(folder.id)}
              disabled={pendingMoveId !== null}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                minHeight: 50,
                borderRadius: radius.sm,
                backgroundColor:
                  movingNote?.folderId === folder.id
                    ? `${folder.color ?? colors.accent}18`
                    : colors.bgOverlay,
                paddingHorizontal: 14,
                paddingVertical: 10,
                opacity: pendingMoveId !== null ? 0.55 : 1,
              }}
            >
              <FolderGlyph name={folder.icon} color={folder.color ?? colors.accent} size={16} />
              <Text variant="h3" style={{ flex: 1, fontSize: 13.5 }}>
                {folder.name}
              </Text>
              {movingNote?.folderId === folder.id ? (
                <Text variant="micro" style={{ color: folder.color ?? colors.accent }}>
                  actuel
                </Text>
              ) : null}
            </PressableScale>
          ))}
          <PressableScale
            accessibilityLabel="Retirer du dossier"
            accessibilityState={{
              selected: movingNote?.folderId === null,
              disabled: pendingMoveId !== null,
            }}
            onPress={() => void moveTo(null)}
            disabled={pendingMoveId !== null}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 50,
              borderRadius: radius.sm,
              backgroundColor:
                movingNote?.folderId === null ? `${colors.accent}14` : colors.bgOverlay,
              paddingHorizontal: 14,
              paddingVertical: 10,
              opacity: pendingMoveId !== null ? 0.55 : 1,
            }}
          >
            <Text variant="h3" style={{ flex: 1, fontSize: 13.5, color: colors.textSecondary }}>
              Sans dossier
            </Text>
            {movingNote?.folderId === null ? <Text variant="micro">actuel</Text> : null}
          </PressableScale>
        </NativeScrollView>
        <View style={{ alignItems: "flex-end", marginTop: 12 }}>
          <ActionChip
            label="Fermer"
            tone="neutral"
            disabled={pendingMoveId !== null}
            onPress={() => setMovingNote(null)}
          />
        </View>
      </AppModal>
    </Screen>
  );
}

function DragGrip(): React.JSX.Element {
  return (
    <View style={{ gap: 3 }}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: "row", gap: 3 }}>
          <View
            style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted }}
          />
          <View
            style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.textMuted }}
          />
        </View>
      ))}
    </View>
  );
}

function NoteCard({
  note,
  folder,
  cardDragGesture,
  handleDragGesture,
  moveDisabled,
  movePending,
  onPress,
  onMove,
}: {
  note: NoteItem;
  folder: NoteFolderItem | null;
  cardDragGesture: PanGesture;
  handleDragGesture: PanGesture;
  moveDisabled: boolean;
  movePending: boolean;
  onPress: () => void;
  onMove: () => void;
}): React.JSX.Element {
  return (
    <Card
      accent={CATEGORY_COLOR[note.category]}
      style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 14 }}
    >
      <View style={{ flexDirection: "row", alignItems: "stretch", gap: 4 }}>
        <View style={{ flex: 1 }}>
          <GestureDetector gesture={cardDragGesture}>
            <PressableScale
              accessibilityLabel={`Ouvrir la note ${note.lessonTitle}`}
              accessibilityHint="Utilise le bouton Ranger pour déplacer la note"
              onPress={onPress}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="h3" numberOfLines={1}>
                  {note.lessonTitle}
                </Text>
                <Text variant="bodySm" numberOfLines={1}>
                  {excerpt(note.content)}
                </Text>
              </View>
              <ChevronRight color={colors.textDisabled} size={13} />
            </PressableScale>
          </GestureDetector>
        </View>

        <GestureDetector gesture={handleDragGesture}>
          <View
            accessible={false}
            style={{
              width: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DragGrip />
          </View>
        </GestureDetector>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          minHeight: 48,
        }}
      >
        <View
          style={{ flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}
        >
          {folder ? (
            <Text
              variant="micro"
              numberOfLines={1}
              style={{ color: folder.color ?? colors.accent, fontSize: 9 }}
            >
              {folder.name}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={{
              fontFamily: `${fonts.mono}_400Regular`,
              fontSize: 9,
              color: colors.textDisabled,
              letterSpacing: 0.4,
            }}
          >
            {note.wordCount} mots · {fmtDate(note.updatedAt)}
          </Text>
        </View>

        <PressableScale
          accessibilityLabel={
            folder ? `Ranger la note. Dossier actuel : ${folder.name}` : "Ranger dans un dossier"
          }
          accessibilityHint="Ouvre la liste des dossiers"
          onPress={onMove}
          disabled={moveDisabled}
          hitSlop={4}
          style={{
            minWidth: 96,
            minHeight: 48,
            paddingHorizontal: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: moveDisabled ? 0.55 : 1,
          }}
        >
          <FolderGlyph name={folder?.icon ?? "folder"} color={colors.accent} size={14} />
          <Text variant="micro" style={{ color: colors.accent, fontSize: 10.5 }}>
            {movePending ? "Rangement…" : "Ranger"}
          </Text>
        </PressableScale>
      </View>
    </Card>
  );
}
