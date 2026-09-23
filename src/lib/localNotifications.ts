import { LocalNotifications } from "@capacitor/local-notifications";
import { isNativeApp } from "@/lib/platform";

/** Ask iOS for permission to show local notifications. No-op outside the native app. */
export async function requestLocalNotificationPermission(): Promise<boolean> {
  if (!isNativeApp) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

export async function hasLocalNotificationPermission(): Promise<boolean> {
  if (!isNativeApp) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

let nextLocalNotificationId = 1;

/**
 * Fire a local (on-device) notification as an echo of an in-app event.
 * This is the same plugin/call surface push notifications will use once a
 * paid Apple Developer account + APNs are set up — swapping in remote push
 * later won't require touching call sites that trigger notifications.
 */
export async function fireLocalNotification(title: string, body: string): Promise<void> {
  if (!isNativeApp) return;
  try {
    const granted = await hasLocalNotificationPermission();
    if (!granted) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: nextLocalNotificationId++,
          title,
          body,
          schedule: { at: new Date(Date.now() + 200) },
        },
      ],
    });
  } catch {
    // Best effort — a failed local echo should never break the in-app notification flow.
  }
}
