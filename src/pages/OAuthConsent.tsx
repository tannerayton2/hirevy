import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

type AuthorizationDetails = {
  client?: { name?: string; logo_uri?: string | null } | null;
  scopes?: string[] | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function getOAuthApi(): OAuthApi | null {
  const authAny = (supabase as unknown as { auth: Record<string, unknown> }).auth;
  const oauth = authAny.oauth as OAuthApi | undefined;
  return oauth ?? null;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const oauth = getOAuthApi();
      if (!oauth) {
        setError("OAuth is not enabled on this project.");
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    const oauth = getOAuthApi();
    if (!oauth) return;
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-10">
      <Logo />
      {error ? (
        <div className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive-foreground">
          <p className="font-semibold">Could not load this authorization request</p>
          <p className="mt-1 text-destructive/90">{error}</p>
        </div>
      ) : !details ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-lg">
          <h1 className="text-xl font-semibold text-foreground">
            Connect {details.client?.name ?? "an app"} to your Aytopus account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This lets {details.client?.name ?? "the client"} use Aytopus tools as you. It can read
            your profile and act on your behalf through the Aytopus MCP server. You can revoke
            access at any time.
          </p>
          <div className="mt-6 flex gap-3">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              Approve
            </Button>
            <Button
              onClick={() => decide(false)}
              disabled={busy}
              variant="secondary"
              className="flex-1"
            >
              Deny
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
