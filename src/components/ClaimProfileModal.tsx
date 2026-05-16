import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Method = "instagram" | "website" | "email";

export function ClaimProfileModal({
  open, onOpenChange, profileId, providerDisplayName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  providerDisplayName: string;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<Method>("instagram");
  const [verificationValue, setVerificationValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast({ title: "Full name required", variant: "destructive" });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast({ title: "Enter a valid email", variant: "destructive" });

    setSaving(true);
    const { error } = await supabase.from("claims_requests").insert({
      profile_id: profileId,
      full_name: fullName.trim().slice(0, 200),
      phone: phone.trim() || null,
      email: email.trim(),
      verification_method: method,
      verification_value: verificationValue.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't submit claim", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Claim submitted", description: "We'll review within 48 hours." });
    onOpenChange(false);
  };

  const methodPlaceholder =
    method === "instagram" ? "@yourhandle" :
    method === "website" ? "https://yourwebsite.com" :
    "Email already on the profile";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Claim your HireVy profile</DialogTitle>
          <DialogDescription>
            We'll verify your identity and transfer control of {providerDisplayName ? `@${providerDisplayName}` : "this profile"} to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <FieldRow label="Your full name" required>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={200} />
          </FieldRow>
          <FieldRow label="Phone number">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </FieldRow>
          <FieldRow label="Your email address" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </FieldRow>

          <div>
            <Label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              How do you want to verify?
            </Label>
            <div className="grid grid-cols-1 gap-2">
              <MethodCard active={method === "instagram"} onClick={() => setMethod("instagram")} title="Instagram" desc="Enter your handle" />
              <MethodCard active={method === "website"} onClick={() => setMethod("website")} title="Website" desc="Enter your URL and we'll check it matches the profile" />
              <MethodCard active={method === "email"} onClick={() => setMethod("email")} title="Email match" desc="Your email matches what's already on the profile" />
            </div>
            {method !== "email" && (
              <Input
                value={verificationValue}
                onChange={(e) => setVerificationValue(e.target.value)}
                placeholder={methodPlaceholder}
                className="mt-2"
              />
            )}
          </div>

          <FieldRow label="Anything else we should know?">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="Optional" />
          </FieldRow>

          <Button type="submit" disabled={saving} className="h-11 w-full text-sm font-semibold">
            {saving ? "Submitting…" : "Submit claim request"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            We review all claim requests manually within 48 hours.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </Label>
      {children}
    </div>
  );
}

function MethodCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
          : "border-border bg-card/50 hover:border-primary/30"
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
