export interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Migrates existing values from a legacy store once, then persists only in the
 * primary secure store. Secure-store failures are propagated so auth tokens
 * are never written back to unencrypted storage.
 */
export function createMigratingStorage(
  primary: KeyValueStorage,
  legacy: KeyValueStorage,
): KeyValueStorage {
  return {
    async getItem(key): Promise<string | null> {
      const primaryValue = await primary.getItem(key);
      if (primaryValue !== null) return primaryValue;

      const legacyValue = await legacy.getItem(key);
      if (legacyValue === null) return null;

      await primary.setItem(key, legacyValue);
      await legacy.removeItem(key).catch(() => undefined);
      return legacyValue;
    },

    async setItem(key, value): Promise<void> {
      await primary.setItem(key, value);
      await legacy.removeItem(key).catch(() => undefined);
    },

    async removeItem(key): Promise<void> {
      await Promise.allSettled([primary.removeItem(key), legacy.removeItem(key)]);
    },
  };
}
