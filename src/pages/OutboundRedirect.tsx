import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * /out/:offerId — logs a click row, increments the offer's outbound_click_count,
 * then redirects to cta_link. Shows a tiny fallback if the offer or link is missing.
 */
export default function OutboundRedirect() {
  const { offerId = "" } = useParams();
  const [params] = useSearchParams();
  const referrer = params.get("ref") || "direct";
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!offerId) { setError("missing"); return; }

      const { data, error: e } = await supabase
        .from("offers")
        .select("cta_link, hosted_on_hirevy, slug, provider:profiles!offers_provider_id_fkey(username)")
        .eq("id", offerId)
        .maybeSingle();

      if (cancelled) return;
      if (e || !data) { setError("missing"); return; }

      const offer = data as unknown as {
        cta_link: string | null;
        hosted_on_hirevy: boolean;
        slug: string;
        provider: { username: string };
      };

      // If hosted on Aytopus or no cta_link, route back to the in-app detail page.
      if (offer.hosted_on_hirevy || !offer.cta_link) {
        window.location.replace(`/@${offer.provider.username}/${offer.slug}`);
        return;
      }

      // Fire-and-forget: log the click. Don't block the redirect on it.
      void supabase.rpc("record_offer_click" as never, {
        p_offer_id: offerId,
        p_referrer: referrer,
      } as never);

      window.location.replace(offer.cta_link);
    })();
    return () => { cancelled = true; };
  }, [offerId, referrer]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Offer link unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This offer doesn't exist or has been removed.
        </p>
        <Link to="/explore" className="mt-6 inline-block text-sm font-semibold uppercase tracking-[0.18em] text-primary hover:underline">
          ← Back to Explore
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
