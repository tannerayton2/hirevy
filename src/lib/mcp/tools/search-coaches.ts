import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "search_coaches",
  title: "Search coaches",
  description:
    "Search Aytopus coaches and service providers by free-text query and/or service category. Returns public profile summaries with rating and review counts.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .max(120)
      .optional()
      .describe("Free-text search matched against username, display name, and bio."),
    category: z
      .string()
      .trim()
      .max(60)
      .optional()
      .describe("Service category filter (e.g. 'Coaching', 'Consulting', 'Fitness')."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    let q = supabase
      .from("profiles")
      .select(
        "username, display_name, bio, service_category, review_count, rating_sum, follower_count, avatar_url",
      )
      .limit(limit ?? 20);
    if (category) q = q.eq("service_category", category);
    if (query && query.length > 0) {
      const like = `%${query.replace(/[%_]/g, "")}%`;
      q = q.or(`username.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`);
    }
    q = q.order("review_count", { ascending: false });
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).map((r) => ({
      username: r.username,
      display_name: r.display_name,
      bio: r.bio,
      service_category: r.service_category,
      review_count: r.review_count,
      average_rating:
        r.review_count && r.review_count > 0
          ? Math.round(((r.rating_sum ?? 0) / r.review_count) * 10) / 10
          : null,
      follower_count: r.follower_count,
      profile_url: `https://aytopus.com/@${r.username}`,
      avatar_url: r.avatar_url,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { results: rows },
    };
  },
});
