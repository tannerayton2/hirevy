import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyReview() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token");
  const [state, setState] = useState<"loading" | "success" | "invalid">("loading");

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    (async () => {
      const { data, error } = await supabase.rpc("verify_review", { p_token: token });
      if (error || !data) setState("invalid");
      else setState("success");
    })();
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-10">
      <Logo />
      <div className="mt-16 rounded-md border border-border bg-card p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Confirming your review…</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Your review is now live</h1>
            <p className="mt-2 text-sm text-muted-foreground">Thanks for helping others hire with confidence.</p>
            <Button className="mt-6" onClick={() => nav("/explore")}>Explore HireVy</Button>
          </>
        )}
        {state === "invalid" && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Link invalid or expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This confirmation link is no longer valid. It may have already been used, or the review was removed.
            </p>
            <Button asChild variant="outline" className="mt-6"><Link to="/">Back to home</Link></Button>
          </>
        )}
      </div>
    </div>
  );
}
