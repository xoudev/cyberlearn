import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { KeyValueStorage } from "@/lib/migrating-storage";
import {
  listModules,
  moduleKey,
  removeModule,
  saveModule,
  type OfflineLesson,
  type OfflineModule,
  type SaveResult,
} from "@/lib/offline";
import { supabase } from "@/lib/supabase";

/**
 * The offline reader bound to the phone: AsyncStorage for the saved modules
 * (lib/offline.ts holds the rules), Supabase for fetching a module's lessons,
 * the same query and RLS as the lesson screen.
 */

export const offlineStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

const MODULES_KEY = ["offline-modules"] as const;

/** The saved modules, read once and kept current by the hooks below. */
export function useOfflineModules(): OfflineModule[] {
  const { data } = useQuery({
    queryKey: MODULES_KEY,
    queryFn: async (): Promise<OfflineModule[]> => {
      try {
        return await listModules(offlineStorage);
      } catch {
        return [];
      }
    },
    staleTime: Infinity,
  });
  return data ?? [];
}

const LESSON_COLUMNS = "id,slug,title,category,difficulty,estimatedMinutes,xpReward,contentMdx";

/** Downloads a module's lessons, in the path's order, and saves them. */
async function downloadModule(
  meta: { pathSlug: string; pathTitle: string; moduleNumber: number; moduleTitle: string | null },
  slugs: readonly string[],
): Promise<SaveResult> {
  const { data, error } = await supabase
    .from("lessons")
    .select(LESSON_COLUMNS)
    .in("slug", [...slugs])
    .eq("status", "PUBLISHED");
  if (error !== null || data === null) {
    return { ok: false, error: "Téléchargement impossible : vérifie ta connexion." };
  }
  // SAFETY: the select names exactly the columns of OfflineLesson.
  const rows = data as unknown as OfflineLesson[];
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const lessons = slugs
    .map((slug) => bySlug.get(slug))
    .filter((lesson): lesson is OfflineLesson => lesson !== undefined);
  return saveModule(offlineStorage, meta, lessons);
}

/** Save and remove a module, the saved list refreshed after either. */
export function useOfflineActions(): {
  save: (
    meta: { pathSlug: string; pathTitle: string; moduleNumber: number; moduleTitle: string | null },
    slugs: readonly string[],
  ) => Promise<SaveResult>;
  remove: (key: string) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const refresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: MODULES_KEY });
  }, [queryClient]);

  const save = useCallback(
    async (
      meta: {
        pathSlug: string;
        pathTitle: string;
        moduleNumber: number;
        moduleTitle: string | null;
      },
      slugs: readonly string[],
    ): Promise<SaveResult> => {
      try {
        const result = await downloadModule(meta, slugs);
        await refresh();
        return result;
      } catch {
        return { ok: false, error: "Enregistrement impossible sur ce téléphone." };
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (key: string): Promise<void> => {
      try {
        await removeModule(offlineStorage, key);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  return { save, remove };
}

export { moduleKey };
