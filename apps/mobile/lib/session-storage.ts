import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createMigratingStorage, type KeyValueStorage } from "@/lib/migrating-storage";

const secureStorage: KeyValueStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

const legacyStorage: KeyValueStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
};

/** Encrypted Supabase session storage with transparent AsyncStorage migration. */
export const sessionStorage = createMigratingStorage(secureStorage, legacyStorage);
