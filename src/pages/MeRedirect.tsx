import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

/**
 * /me → redirect to the logged-in user's @username profile,
 * or to onboarding if the username hasn't been set yet.
 */
export default function MeRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.username) return <Navigate to="/explore" replace />;
  return <Navigate to={`/@${profile.username}`} replace />;
}
