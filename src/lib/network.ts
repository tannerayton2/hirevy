// The Aytopus Network (explore, offers, profiles, messages) is hidden while we
// grow the proof-card base. Flip VITE_NETWORK_PUBLIC=true in Vercel to open it.
// Admins can always see it, so it can keep being built.
import { useAuth } from "@/hooks/useAuth";
import { isAdminUsername } from "@/lib/admin";

export const NETWORK_PUBLIC = import.meta.env.VITE_NETWORK_PUBLIC === "true";

export function useNetworkAccess() {
  const { profile, loading } = useAuth();
  return { canSeeNetwork: NETWORK_PUBLIC || isAdminUsername(profile?.username), loading };
}

/** Where "home" is for a signed-in person. */
export function homePath(canSeeNetwork: boolean) {
  return canSeeNetwork ? "/explore" : "/settings/proof";
}
