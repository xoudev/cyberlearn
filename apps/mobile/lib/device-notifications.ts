import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import type { NotificationItem } from "@/lib/queries";
import { dbTime } from "@/lib/db-time";

// Mirrors the in-app inbox to the DEVICE notification tray with local
// notifications. expo-notifications was REMOVED from Expo Go on Android
// (SDK 53+) and throws at import time there, so the module is loaded lazily
// behind a try/catch: silently inert in Expo Go, active in real dev/prod
// builds. True remote push (app closed) will ride on this once an EAS dev
// build exists.

const LAST_SEEN_KEY = "cl.notifications.lastSeenAt";
const ENABLED_KEY = "cl.notifications.deviceEnabled";

type NotificationsModule = typeof import("expo-notifications");

// Expo Go ("store client") has no notification runtime on Android since
// SDK 53 - requiring the module there logs a red error even when caught.
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let cached: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (IS_EXPO_GO && Platform.OS === "android") {
    cached = null;
    return cached;
  }
  try {
    // SAFETY: dynamic require so an import-time throw in a stripped runtime
    // cannot break every module that transitively imports this file.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require("expo-notifications") as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

let configured = false;

async function ensureConfigured(): Promise<boolean> {
  const N = getNotifications();
  if (!N) return false;
  try {
    if (!configured) {
      N.setNotificationHandler({
        handleNotification: () =>
          Promise.resolve({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
          }),
      });
      if (Platform.OS === "android") {
        await N.setNotificationChannelAsync("default", {
          name: "CyberLearn",
          importance: N.AndroidImportance.DEFAULT,
          lightColor: "#0affd4",
        });
      }
      configured = true;
    }
    const perms = await N.getPermissionsAsync();
    if (perms.granted) return true;
    if (!perms.canAskAgain) return false;
    const req = await N.requestPermissionsAsync();
    return req.granted;
  } catch {
    // Notification runtime unavailable (e.g. stripped Expo Go).
    return false;
  }
}

/** Whether this runtime can show device notifications at all. */
export function deviceNotificationsSupported(): boolean {
  return getNotifications() !== null;
}

export async function isDeviceNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) !== "0";
}

export async function setDeviceNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? "1" : "0");
  if (enabled) await ensureConfigured();
}

/**
 * Present device notifications for inbox items newer than the last mirrored
 * one. Call with the freshly-fetched inbox; keeps its own high-water mark.
 */
export async function mirrorInboxToDevice(items: NotificationItem[]): Promise<void> {
  if (items.length === 0) return;
  const N = getNotifications();
  if (!N) return;
  if (!(await isDeviceNotificationsEnabled())) return;

  const lastSeenRaw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  // First run: don't spam the tray with the whole history - just set the mark.
  if (lastSeenRaw === null) {
    const newest = items[0]?.createdAt;
    if (newest) await AsyncStorage.setItem(LAST_SEEN_KEY, newest);
    return;
  }

  // Read as UTC: a mark stored by an older version is the raw database text.
  const lastSeen = dbTime(lastSeenRaw).getTime();
  const fresh = items.filter((n) => dbTime(n.createdAt).getTime() > lastSeen).slice(0, 5); // cap a burst
  if (fresh.length === 0) return;

  if (!(await ensureConfigured())) return;

  for (const n of fresh.reverse()) {
    try {
      await N.scheduleNotificationAsync({
        content: { title: n.title, body: n.body },
        trigger: null, // deliver immediately
      });
    } catch {
      return; // runtime without notification support - stop quietly
    }
  }
  const newest = items[0]?.createdAt;
  if (newest) await AsyncStorage.setItem(LAST_SEEN_KEY, newest);
}
