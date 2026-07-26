export interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Reads existing values from a legacy store once, then keeps new values in the
 * primary store. If the primary store is temporarily unavailable, persistence
 * falls back to the legacy store instead of losing the session.
 */
export function createMigratingStorage(
  primary: KeyValueStorage,
  legacy: KeyValueStorage,
): KeyValueStorage {
  return {
    async getItem(key): Promise<string | null> {
      try {
        const primaryValue = await primary.getItem(key);
        if (primaryValue !== null) return primaryValue;
      } catch {
        // The legacy read below keeps authentication usable on unsupported devices.
      }

      const legacyValue = await legacy.getItem(key);
      if (legacyValue === null) return null;

      try {
        await primary.setItem(key, legacyValue);
        await legacy.removeItem(key).catch(() => undefined);
      } catch {
        // Keep the legacy value in place when secure persistence is unavailable.
      }
      return legacyValue;
    },

    async setItem(key, value): Promise<void> {
      try {
        await primary.setItem(key, value);
        await legacy.removeItem(key).catch(() => undefined);
      } catch {
        await legacy.setItem(key, value);
      }
    },

    async removeItem(key): Promise<void> {
      await Promise.allSettled([primary.removeItem(key), legacy.removeItem(key)]);
    },
  };
}
