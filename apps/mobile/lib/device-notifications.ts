import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { NotificationItem } from "@/lib/queries";

// Mirrors the in-app inbox to the DEVICE notification tray with local
// notifications. Works without any push infrastructure (and inside Expo Go);
// true remote push (app closed) will ride on this once an EAS dev build exists.

const LAST_SEEN_KEY = "cl.notifications.lastSeenAt";
const ENABLED_KEY = "cl.notifications.deviceEnabled";

let configured = false;

async function ensureConfigured(): Promise<boolean> {
  try {
    if (!configured) {
      Notifications.setNotificationHandler({
        handleNotification: () =>
          Promise.resolve({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: true,
          }),
      });
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "CyberLearn",
          importance: Notifications.AndroidImportance.DEFAULT,
          lightColor: "#0affd4",
        });
      }
      configured = true;
    }
    const perms = await Notifications.getPermissionsAsync();
    if (perms.granted) return true;
    if (!perms.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    // expo-notifications unavailable in this runtime (e.g. stripped Expo Go).
    return false;
  }
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
  if (!(await isDeviceNotificationsEnabled())) return;

  const lastSeenRaw = await AsyncStorage.getItem(LAST_SEEN_KEY);
  // First run: don't spam the tray with the whole history - just set the mark.
  if (lastSeenRaw === null) {
    const newest = items[0]?.createdAt;
    if (newest) await AsyncStorage.setItem(LAST_SEEN_KEY, newest);
    return;
  }

  const lastSeen = new Date(lastSeenRaw).getTime();
  const fresh = items.filter((n) => new Date(n.createdAt).getTime() > lastSeen).slice(0, 5); // cap a burst
  if (fresh.length === 0) return;

  if (!(await ensureConfigured())) return;

  for (const n of fresh.reverse()) {
    try {
      await Notifications.scheduleNotificationAsync({
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
