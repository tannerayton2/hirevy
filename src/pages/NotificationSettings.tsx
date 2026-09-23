import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Bell, BellRing } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { isNativeApp } from "@/lib/platform";
import { hasLocalNotificationPermission, requestLocalNotificationPermission } from "@/lib/localNotifications";
import { NOTIFICATION_PREF_LABELS, type NotificationPrefKey } from "@/lib/notificationPreferences";

const PREF_KEYS: NotificationPrefKey[] = [
  "follow",
  "review_received",
  "message",
  "tier_reached",
  "claim_approved",
  "announcements",
];

type Prefs = Record<NotificationPrefKey, boolean>;

const DEFAULT_PREFS: Prefs = {
  follow: true,
  review_received: true,
  message: true,
  tier_reached: true,
  claim_approved: true,
  announcements: true,
};

export default function NotificationSettings() {
  const { user, loading } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [savingKey, setSavingKey] = useState<NotificationPrefKey | null>(null);

  const [devicePermission, setDevicePermission] = useState<boolean | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingPrefs(true);
      setLoadError(false);
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setLoadingPrefs(false);
      if (error) {
        setLoadError(true);
        return;
      }
      if (data) {
        setPrefs({
          follow: data.follow,
          review_received: data.review_received,
          message: data.message,
          tier_reached: data.tier_reached,
          claim_approved: data.claim_approved,
          announcements: data.announcements,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!isNativeApp) return;
    void hasLocalNotificationPermission().then(setDevicePermission);
  }, []);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const togglePref = async (key: NotificationPrefKey, value: boolean) => {
    if (!user) return;
    const prev = prefs[key];
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSavingKey(key);
    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSavingKey(null);
    if (error) {
      setPrefs((p) => ({ ...p, [key]: prev }));
      toast({ title: "Couldn't save that setting", description: "Please try again.", variant: "destructive" });
    }
  };

  const enableDeviceNotifications = async () => {
    setRequestingPermission(true);
    const granted = await requestLocalNotificationPermission();
    setRequestingPermission(false);
    setDevicePermission(granted);
    if (!granted) {
      toast({
        title: "Notifications not enabled",
        description: "You can turn them on later from your iPhone's Settings app.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8 md:py-10">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">Settings</p>
      <h1 className="font-display text-3xl font-bold">Notifications</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose what you hear about, and how.</p>

      {isNativeApp && (
        <section className="mt-8 rounded-md border border-border bg-card p-5 md:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <BellRing className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold">Device notifications</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Allow Aytopus to show notifications on this iPhone. Push notifications for background alerts are coming in a future update — for now this covers on-device alerts while notifications are enabled.
              </p>
            </div>
          </div>
          {devicePermission === true ? (
            <p className="text-sm font-medium text-primary">Enabled on this device.</p>
          ) : (
            <Button type="button" onClick={() => void enableDeviceNotifications()} disabled={requestingPermission}>
              {requestingPermission ? "Requesting…" : "Enable device notifications"}
            </Button>
          )}
        </section>
      )}

      <section className="mt-8 rounded-md border border-border bg-card p-5 md:p-6">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold">What you're notified about</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">These control both the in-app notification list and device alerts.</p>
          </div>
        </div>

        {loadingPrefs ? (
          <p className="text-sm text-muted-foreground">Loading your preferences…</p>
        ) : loadError ? (
          <p className="text-sm text-muted-foreground">Couldn't load your preferences. Try refreshing this page.</p>
        ) : (
          <div className="divide-y divide-border">
            {PREF_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <Label htmlFor={`pref-${key}`} className="text-sm font-medium text-foreground">
                  {NOTIFICATION_PREF_LABELS[key]}
                </Label>
                <Switch
                  id={`pref-${key}`}
                  checked={prefs[key]}
                  disabled={savingKey === key}
                  onCheckedChange={(checked) => void togglePref(key, checked)}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
