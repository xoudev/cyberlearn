import { describe, expect, it } from "vitest";
import { createMigratingStorage, type KeyValueStorage } from "../migrating-storage";

interface FakeStorage extends KeyValueStorage {
  values: Map<string, string>;
  failReads: boolean;
  failWrites: boolean;
}

function createFakeStorage(initial: Record<string, string> = {}): FakeStorage {
  const storage: FakeStorage = {
    values: new Map(Object.entries(initial)),
    failReads: false,
    failWrites: false,
    async getItem(key) {
      if (storage.failReads) throw new Error("read failed");
      return storage.values.get(key) ?? null;
    },
    async setItem(key, value) {
      if (storage.failWrites) throw new Error("write failed");
      storage.values.set(key, value);
    },
    async removeItem(key) {
      storage.values.delete(key);
    },
  };
  return storage;
}

describe("createMigratingStorage", () => {
  it("prefers an existing primary value", async () => {
    const primary = createFakeStorage({ session: "secure" });
    const legacy = createFakeStorage({ session: "legacy" });
    const storage = createMigratingStorage(primary, legacy);

    await expect(storage.getItem("session")).resolves.toBe("secure");
    expect(legacy.values.get("session")).toBe("legacy");
  });

  it("moves a legacy value into the primary store", async () => {
    const primary = createFakeStorage();
    const legacy = createFakeStorage({ session: "legacy" });
    const storage = createMigratingStorage(primary, legacy);

    await expect(storage.getItem("session")).resolves.toBe("legacy");
    expect(primary.values.get("session")).toBe("legacy");
    expect(legacy.values.has("session")).toBe(false);
  });

  it("never falls back to unencrypted persistence when primary writes fail", async () => {
    const primary = createFakeStorage();
    primary.failWrites = true;
    const legacy = createFakeStorage();
    const storage = createMigratingStorage(primary, legacy);

    await expect(storage.setItem("session", "secret")).rejects.toThrow("write failed");

    expect(legacy.values.has("session")).toBe(false);
  });

  it("does not read legacy tokens when the secure store is unavailable", async () => {
    const primary = createFakeStorage();
    primary.failReads = true;
    const legacy = createFakeStorage({ session: "legacy" });
    const storage = createMigratingStorage(primary, legacy);

    await expect(storage.getItem("session")).rejects.toThrow("read failed");
  });

  it("removes values from both stores", async () => {
    const primary = createFakeStorage({ session: "secure" });
    const legacy = createFakeStorage({ session: "legacy" });
    const storage = createMigratingStorage(primary, legacy);

    await storage.removeItem("session");

    expect(primary.values.has("session")).toBe(false);
    expect(legacy.values.has("session")).toBe(false);
  });
});
