import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BASE_COACH_CATEGORIES = [
  "Business Coaching",
  "Sales",
  "Copywriting",
  "Fitness & Health",
  "Mindset",
  "Marketing",
  "Finance",
  "Life Coaching",
] as const;

const OTHER = "Other";

/**
 * Returns the dynamic category list: base defaults first (in their canonical order),
 * then any custom categories saved on profiles (alphabetical, case-insensitive de-dupe),
 * then "Other" always last.
 */
export function useProfileCategories(): string[] {
  const [extras, setExtras] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("service_category")
        .not("service_category", "is", null)
        .limit(1000);
      if (cancelled || !data) return;
      const baseLower = new Set(
        BASE_COACH_CATEGORIES.map((c) => c.toLowerCase()),
      );
      baseLower.add(OTHER.toLowerCase());
      const seen = new Set<string>();
      const customs: string[] = [];
      for (const row of data as { service_category: string | null }[]) {
        const raw = (row.service_category ?? "").trim();
        if (!raw) continue;
        const key = raw.toLowerCase();
        if (baseLower.has(key) || seen.has(key)) continue;
        seen.add(key);
        customs.push(raw);
      }
      customs.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      setExtras(customs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return [...BASE_COACH_CATEGORIES, ...extras, OTHER];
}
