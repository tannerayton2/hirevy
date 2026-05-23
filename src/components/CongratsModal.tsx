import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { TIER_LABEL, TIER_COLOR, nextTier, type Tier } from "@/lib/tiers";

type Variant =
  | { kind: "first-submitted" }
  | { kind: "first-received" }
  | { kind: "tier-up"; tier: Tier; points: number; pointsToNext: number };

interface Props {
  open: boolean;
  variant: Variant | null;
  onClose: () => void;
  onPrimary?: () => void;
}

export function CongratsModal({ open, variant, onClose, onPrimary }: Props) {
  if (!variant) return null;

  if (variant.kind === "tier-up") {
    const isMax = !nextTier(variant.tier);
    const next = nextTier(variant.tier);
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm border-border bg-card text-center">
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="flex items-center justify-center" style={{ width: 160 }}>
              <div style={{ transform: "scale(1.4)", transformOrigin: "center" }}>
                <TierBadge tier={variant.tier} size="lg" />
              </div>
            </div>
            <h2 className="font-display text-3xl font-bold">
              {isMax ? "You reached the top." : "You leveled up."}
            </h2>
            <p
              className="font-display text-xl font-semibold"
              style={{ color: TIER_COLOR[variant.tier] }}
            >
              {TIER_LABEL[variant.tier]}
            </p>
            {!isMax && next && (
              <p className="text-sm text-muted-foreground">
                {variant.pointsToNext} {variant.pointsToNext === 1 ? "point" : "points"} to {TIER_LABEL[next]}
              </p>
            )}
            <Button
              onClick={() => {
                onPrimary?.();
                onClose();
              }}
              className="w-full font-semibold"
              style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
            >
              {isMax ? "View my profile →" : "Let's go →"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  let icon: React.ReactNode;
  let title = "";
  let body = "";
  let cta = "Continue";

  if (variant.kind === "first-submitted") {
    icon = <CheckCircle2 className="h-16 w-16" style={{ color: "#FFD700" }} strokeWidth={1.5} />;
    title = "First review submitted!";
    body = "You're helping build trust in the info industry.";
    cta = "Continue";
  } else {
    icon = <Star className="h-16 w-16 fill-current" style={{ color: "#FFD700" }} strokeWidth={1.5} />;
    title = "You received your first review!";
    body = "Check your profile to see what they said.";
    cta = "View Profile";
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm border-border bg-card text-center">
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="flex items-center justify-center">{icon}</div>
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{body}</p>
          <Button
            onClick={() => {
              onPrimary?.();
              onClose();
            }}
            className="w-full font-semibold"
            style={{ background: "linear-gradient(135deg,#FFE98A,#FFD700,#B8860B)", color: "#2a1c00" }}
          >
            {cta}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
