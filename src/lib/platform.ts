import { Capacitor } from "@capacitor/core";

/** True when running inside the native iOS/Android Capacitor shell. */
export const isNativeApp = Capacitor.isNativePlatform();

/**
 * Origin to put in links that leave the app (email confirmations, password
 * resets, verification emails). Inside Capacitor, window.location.origin is
 * capacitor://localhost, which can't be opened from an email.
 */
export const webOrigin = isNativeApp ? "https://aytopus.com" : window.location.origin;
