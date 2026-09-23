import { supabase } from "@/integrations/supabase/client";

export type NotificationPrefKey =
  | "follow"
  | "review_received"
  | "message"
  | "tier_reached"
  | "claim_approved"
  | "announcements";

export const NOTIFICATION_PREF_LABELS: Record<NotificationPrefKey, string> = {
  follow: "New followers",
  review_received: "New reviews",
  message: "Messages",
  tier_reached: "Tier milestones",
  claim_approved: "Profile claim updates",
  announcements: "Announcements from Aytopus",
};

const TYPE_TO_PREF_KEY: Record<string, NotificationPrefKey> = {
  follow: "follow",
  review_received: "review_received",
  message: "message",
  tier_reached: "tier_reached",
  claim_approved: "claim_approved",
};

/** Row-level "is this notification type enabled" check, honoring the default-on row-doesn't-exist-yet case. */
export async function isNotificationTypeEnabled(type: string): Promise<boolean> {
  const key = TYPE_TO_PREF_KEY[type] ?? "announcements";
  const { data } = await supabase.from("notification_preferences").select(key).maybeSingle();
  if (!data) return true;
  return (data as Record<string, boolean>)[key] !== false;
}
