import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State = "loading" | "valid" | "already" | "invalid" | "done" | "error";

export default function Unsubscribe() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json().catch(() => ({}));
        if (data?.valid) setState("valid");
        else if (data?.reason === "already_unsubscribed") setState("already");
        else setState("invalid");
      } catch {
        setState("error");
      }
    })();
  }, [token]);

  const confirm = async () => {
    if (!token) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    if (error) { setState("error"); return; }
    if (data?.success || data?.reason === "already_unsubscribed") setState("done");
    else setState("error");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <Logo className="mx-auto" />
        {state === "loading" && <p className="text-sm text-muted-foreground">Checking your unsubscribe link…</p>}
        {state === "valid" && (
          <>
            <h1 className="font-display text-2xl font-bold">Unsubscribe from emails</h1>
            <p className="text-sm text-muted-foreground">
              You'll stop receiving emails from Aytopus at this address.
            </p>
            <Button onClick={confirm} disabled={busy} className="h-11 w-full font-semibold">
              {busy ? "Unsubscribing…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}
        {state === "already" && <p className="text-sm text-muted-foreground">You're already unsubscribed.</p>}
        {state === "done" && (
          <>
            <h1 className="font-display text-2xl font-bold">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You won't receive further emails from Aytopus.</p>
          </>
        )}
        {state === "invalid" && <p className="text-sm text-destructive">This unsubscribe link is invalid or has expired.</p>}
        {state === "error" && <p className="text-sm text-destructive">Something went wrong. Please try again later.</p>}
      </div>
    </div>
  );
}
