import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ProviderReply } from "./ProviderReply";
import { ReviewValidityBar } from "./ReviewValidityBar";
import { amountLabel, dateRangeLabel, engagementLabel } from "@/lib/proofReviews";
import { AlertTriangle, FileSearch, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface ProofReview {
  id: string;
  provider_id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  engagement_type: string;
  engagement_started_month: number;
  engagement_started_year: number;
  engagement_ended_month: number | null;
  engagement_ended_year: number | null;
  engagement_ongoing: boolean;
  amount_paid_bracket: string | null;
  proof_file_count: number;
  is_disputed: boolean;
  created_at: string;
  completeness_score?: number;
}

interface Props {
  review: ProofReview;
  providerDisplayName: string;
  isProviderViewer: boolean;
}

export function ProofReviewCard({ review, providerDisplayName, isProviderViewer }: Props) {
  const { user } = useAuth();
  const [disputing, setDisputing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestEmail, setRequestEmail] = useState(user?.email ?? "");
  const [requestMsg, setRequestMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [isDisputed, setIsDisputed] = useState(review.is_disputed);

  // Formal dispute form state
  const [openFormalDispute, setOpenFormalDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeEvidence, setDisputeEvidence] = useState("");
  const [disputeContact, setDisputeContact] = useState(user?.email ?? "");

  const flagDisputed = async () => {
    setDisputing(true);
    const { error } = await supabase
      .from("proof_backed_reviews")
      .update({ is_disputed: true, disputed_at: new Date().toISOString() })
      .eq("id", review.id);
    setDisputing(false);
    if (error) {
      toast({ title: "Could not flag", description: error.message, variant: "destructive" });
      return;
    }
    setIsDisputed(true);
    toast({ title: "Marked as disputed", description: "A small label now appears on this review." });
  };

  const submitFormalDispute = async () => {
    if (disputeReason.trim().length < 20) {
      toast({ title: "Add more detail", description: "Reason must be at least 20 characters.", variant: "destructive" });
      return;
    }
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("admin_disputes").insert({
      review_id: review.id,
      review_type: "proof_backed",
      provider_id: user.id,
      reason: disputeReason.trim(),
      counter_evidence: disputeEvidence.trim() || null,
      contact_email: disputeContact.trim().toLowerCase(),
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    setOpenFormalDispute(false);
    setDisputeReason("");
    setDisputeEvidence("");
    toast({ title: "Dispute submitted", description: "A HireVy admin will review your dispute." });
  };

  const submitProofRequest = async () => {
    if (!requestEmail.trim() && !user) {
      toast({ title: "Email required", description: "We need a way to contact you.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("proof_access_requests").insert({
      proof_review_id: review.id,
      requester_user_id: user?.id ?? null,
      requester_email: user ? null : requestEmail.trim().toLowerCase(),
      requester_message: requestMsg.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    setRequesting(false);
    setRequestMsg("");
    toast({ title: "Request sent", description: "The reviewer will be notified. You'll hear back if approved." });
  };

  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{review.reviewer_name}</p>
          {isDisputed && (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive">
              <AlertTriangle className="h-3 w-3" /> Disputed by provider
            </span>
          )}
        </div>
        <StarRating value={review.rating} size={14} />
      </div>

      <p className="whitespace-pre-line text-sm text-muted-foreground">{review.body}</p>

      {/* Metadata */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground md:grid-cols-3">
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Engagement</dt>
          <dd className="text-foreground/80">{engagementLabel(review.engagement_type)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Dates</dt>
          <dd className="text-foreground/80">
            {dateRangeLabel(
              review.engagement_started_month, review.engagement_started_year,
              review.engagement_ended_month, review.engagement_ended_year, review.engagement_ongoing,
            )}
          </dd>
        </div>
        {amountLabel(review.amount_paid_bracket) && (
          <div>
            <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Amount</dt>
            <dd className="text-foreground/80">{amountLabel(review.amount_paid_bracket)}</dd>
          </div>
        )}
      </dl>

      {/* Proof badge + request button */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {review.proof_file_count} proof document{review.proof_file_count === 1 ? "" : "s"} attached
        </span>

        <Dialog open={requesting} onOpenChange={setRequesting}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">
              <FileSearch className="mr-1 h-3 w-3" /> Request to see proof
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request to see proof</DialogTitle>
              <DialogDescription>
                The reviewer will be notified. They can choose to share the proof with you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {!user && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Your email</label>
                  <Input type="email" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Why are you asking? (optional)</label>
                <Textarea value={requestMsg} onChange={(e) => setRequestMsg(e.target.value)} rows={3} maxLength={1000} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRequesting(false)}>Cancel</Button>
              <Button onClick={submitProofRequest} disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isProviderViewer && !isDisputed && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={flagDisputed} disabled={disputing}>
            <AlertTriangle className="mr-1 h-3 w-3" /> Mark disputed
          </Button>
        )}

        {isProviderViewer && (
          <Dialog open={openFormalDispute} onOpenChange={setOpenFormalDispute}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                Request removal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit a formal dispute</DialogTitle>
                <DialogDescription>
                  A HireVy admin will review this. You'll be contacted at the email below.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reason (min 20 chars)</label>
                  <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} rows={4} maxLength={4000} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Counter-evidence (optional)</label>
                  <Textarea value={disputeEvidence} onChange={(e) => setDisputeEvidence(e.target.value)} rows={3} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Contact email</label>
                  <Input type="email" value={disputeContact} onChange={(e) => setDisputeContact(e.target.value)} required />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpenFormalDispute(false)}>Cancel</Button>
                <Button onClick={submitFormalDispute} disabled={busy}>{busy ? "Submitting…" : "Submit dispute"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        {new Date(review.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
      </p>

      <ProviderReply
        reviewId={review.id}
        reviewType="proof_backed"
        providerId={review.provider_id}
        providerDisplayName={providerDisplayName}
        isProviderViewer={isProviderViewer}
      />
    </article>
  );
}
