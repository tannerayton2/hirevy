import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ReviewCompletenessShield } from "./ReviewCompletenessShield";
import { ProviderReply } from "./ProviderReply";
import { amountLabel } from "@/lib/proofReviews";
import { BadgeCheck, FileLock2, ShieldCheck, Instagram, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ReviewerIdentity } from "./ReviewerIdentity";

export interface ReviewDetail {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  created_at: string;
  completeness_score: number;
  is_detailed?: boolean;
  purchased?: boolean | null;
  amount_paid_bracket?: string | null;
  offer_url?: string | null;
  instagram_handle?: string | null;
  strength_tier?: string | null;
  evidence_count?: number | null;
  reviewer_user_id?: string | null;
  reviewer_username?: string | null;
  reviewer_display_name?: string | null;
  reviewer_avatar_url?: string | null;
  offer_id?: string | null;
  offer_title?: string | null;
  offer_slug?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: ReviewDetail | null;
  providerId: string;
  providerUsername?: string;
  providerDisplayName: string;
  isProviderViewer: boolean;
}

const TIER_LABEL: Record<string, string> = {
  basic: "Basic",
  standard: "Standard",
  strong: "Strong",
  ironclad: "Ironclad",
};

export function ReviewDetailDialog({
  open, onOpenChange, review, providerId, providerUsername, providerDisplayName, isProviderViewer,
}: Props) {
  const { user } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const [requesterEmail, setRequesterEmail] = useState(user?.email ?? "");
  const [requesterMsg, setRequesterMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!review) return null;

  const submitAccessRequest = async () => {
    if (!user && !requesterEmail.trim()) {
      toast({ title: "Email required", description: "We need a way to contact you.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("proof_access_requests").insert({
      review_id: review.id,
      proof_review_id: null,
      requester_user_id: user?.id ?? null,
      requester_email: user ? null : requesterEmail.trim().toLowerCase(),
      requester_message: requesterMsg.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    setRequesting(false);
    setRequesterMsg("");
    toast({ title: "Request sent", description: "The reviewer will be notified. You'll hear back if approved." });
  };

  const evidenceCount = review.evidence_count ?? 0;
  const tierLabel = review.strength_tier ? TIER_LABEL[review.strength_tier] ?? null : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-left">Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header: reviewer + rating */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <ReviewerIdentity
                reviewerName={review.reviewer_name}
                userId={review.reviewer_user_id}
                username={review.reviewer_username}
                displayName={review.reviewer_display_name}
                avatarUrl={review.reviewer_avatar_url}
                size="md"
                onNavigate={() => onOpenChange(false)}
              />
              <p className="pl-12 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {new Date(review.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StarRating value={review.rating} size={16} />
              <ReviewCompletenessShield score={review.completeness_score ?? 0} />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {review.is_detailed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary ring-1 ring-primary/30">
                <BadgeCheck className="h-3 w-3" /> Detailed
              </span>
            )}
            {tierLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80">
                <ShieldCheck className="h-3 w-3" /> {tierLabel} tier
              </span>
            )}
            {review.purchased && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                <ShieldCheck className="h-3 w-3" /> Verified purchase
              </span>
            )}
          </div>

          {/* Body */}
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">
            {review.body}
          </p>

          {/* Metadata */}
          {(review.amount_paid_bracket || review.instagram_handle || review.offer_url) && (
            <dl className="grid grid-cols-1 gap-3 rounded-md border border-border/70 bg-muted/30 p-3 text-xs sm:grid-cols-2">
              {amountLabel(review.amount_paid_bracket) && (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Amount paid</dt>
                  <dd className="mt-0.5 text-foreground/90">{amountLabel(review.amount_paid_bracket)}</dd>
                </div>
              )}
              {review.instagram_handle && (
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Reviewer</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-1 text-foreground/90">
                    <Instagram className="h-3 w-3" /> {review.instagram_handle}
                  </dd>
                </div>
              )}
              {review.offer_url && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Offer purchased</dt>
                  <dd className="mt-0.5">
                    <a
                      href={review.offer_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      View offer <ExternalLink className="h-3 w-3" />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* Evidence — never render file links */}
          {evidenceCount > 0 && (
            <div className="rounded-md border border-border/70 bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileLock2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {evidenceCount} evidence file{evidenceCount === 1 ? "" : "s"} attached
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Private (contracts, invoices). Request access to view.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setRequesting(true)}>
                  Request access
                </Button>
              </div>
            </div>
          )}

          <ProviderReply
            reviewId={review.id}
            reviewType="verified"
            providerId={providerId}
            providerDisplayName={providerDisplayName}
            isProviderViewer={isProviderViewer}
          />
        </div>

        {/* Nested access request dialog */}
        <Dialog open={requesting} onOpenChange={setRequesting}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request to view evidence</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              The reviewer will be notified. They decide whether to share these private files with you.
            </p>
            <div className="space-y-3 mt-2">
              {!user && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your email</label>
                  <Input type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Why are you asking? (optional)
                </label>
                <Textarea value={requesterMsg} onChange={(e) => setRequesterMsg(e.target.value)} rows={3} maxLength={1000} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRequesting(false)}>Cancel</Button>
              <Button onClick={submitAccessRequest} disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
