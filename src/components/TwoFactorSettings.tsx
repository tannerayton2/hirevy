import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function TwoFactorSettings() {
  const [loadingFactors, setLoadingFactors] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);

  const [enrolling, setEnrolling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const loadFactors = useCallback(async () => {
    setLoadingFactors(true);
    setLoadError(false);
    const { data, error } = await supabase.auth.mfa.listFactors();
    setLoadingFactors(false);
    if (error) {
      setLoadError(true);
      return;
    }
    const totp = data?.totp?.find((f) => f.status === "verified") ?? null;
    setVerifiedFactorId(totp?.id ?? null);
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const startEnroll = async () => {
    setStarting(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    setStarting(false);
    if (error || !data) {
      toast({ title: "Couldn't start setup", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    setPendingFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  };

  const cancelEnroll = async () => {
    const factorId = pendingFactorId;
    setEnrolling(false);
    setPendingFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
  };

  const verifyEnroll = async () => {
    if (!pendingFactorId || code.trim().length < 6) return;
    setVerifying(true);
    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: pendingFactorId });
    if (challengeErr || !challenge) {
      setVerifying(false);
      toast({ title: "Couldn't verify", description: "Please try again.", variant: "destructive" });
      return;
    }
    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setVerifying(false);
    if (verifyErr) {
      toast({ title: "Incorrect code", description: "Double-check the 6-digit code and try again.", variant: "destructive" });
      return;
    }
    toast({ title: "Two-factor authentication enabled", description: "Your account is now protected with an authenticator app." });
    setEnrolling(false);
    setPendingFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    await loadFactors();
  };

  const disable2fa = async () => {
    if (!verifiedFactorId) return;
    setDisabling(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    setDisabling(false);
    if (error) {
      toast({ title: "Couldn't turn off 2FA", description: "Please try again in a moment.", variant: "destructive" });
      return;
    }
    toast({ title: "Two-factor authentication turned off" });
    await loadFactors();
  };

  if (loadingFactors) {
    return <p className="text-sm text-muted-foreground">Checking your two-factor status…</p>;
  }

  if (loadError) {
    return <p className="text-sm text-muted-foreground">Couldn't load your two-factor status. Try refreshing this page.</p>;
  }

  if (verifiedFactorId) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <ShieldCheck className="h-4 w-4" /> Two-factor authentication is on
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={disabling}>
              <ShieldOff className="mr-1.5 h-3.5 w-3.5" /> Turn off 2FA
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Turn off two-factor authentication?</AlertDialogTitle>
              <AlertDialogDescription>
                Your account will only require your password to sign in. You can turn it back on any time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); void disable2fa(); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {disabling ? "Turning off…" : "Turn off"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (enrolling) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with an authenticator app (like Google Authenticator, Authy, or Apple's built-in Passwords app), then enter the 6-digit code it shows.
        </p>
        {qrCode && (
          <div className="flex justify-center rounded-md border border-border bg-white p-4">
            <img src={qrCode} alt="Scan with your authenticator app" className="h-40 w-40" />
          </div>
        )}
        {secret && (
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Can't scan? Enter this key</Label>
            <Input readOnly value={secret} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="totpCode" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">6-digit code</Label>
          <Input
            id="totpCode"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void verifyEnroll()} disabled={verifying || code.trim().length < 6}>
            {verifying ? "Verifying…" : "Verify & enable"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void cancelEnroll()} disabled={verifying}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Add an extra layer of security. When enabled, you'll enter a code from your authenticator app after your password when signing in.
      </p>
      <Button type="button" onClick={() => void startEnroll()} disabled={starting}>
        {starting ? "Starting…" : "Enable two-factor authentication"}
      </Button>
    </div>
  );
}
