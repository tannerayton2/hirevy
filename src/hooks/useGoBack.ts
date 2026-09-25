import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Go back one screen, or to `fallback` when there's nothing to go back to
 * (e.g. the screen was opened from a deep link or a notification).
 * React Router's BrowserRouter stores the history index in history.state.idx.
 */
export function useGoBack(fallback = "/explore") {
  const navigate = useNavigate();
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
