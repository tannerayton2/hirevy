import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkAccess } from "@/lib/network";

/** Wraps network-only pages. Everyone else is sent to their proof card, or the home page. */
export function NetworkGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { canSeeNetwork, loading } = useNetworkAccess();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!canSeeNetwork) return <Navigate to={user ? "/card" : "/proofcard"} replace />;
  return <>{children}</>;
}
