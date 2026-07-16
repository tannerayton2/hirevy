import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_coach_reviews",
  title: "List coach reviews",
  description:
    "List verified reviews written for an Aytopus coach or service provider, identified by username.",
  inputSchema: {
    username: z.string().trim().min(1).max(60).describe("Aytopus username, no @ prefix."),
    limit: z.number().int().min(1).max(50).optional().describe("Max reviews to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ username, limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("username", username)
      .maybeSingle();
    if (pErr) return { content: [{ type: "text", text: pErr.message }], isError: true };
    if (!prof)
      return { content: [{ type: "text", text: `No profile found for @${username}` }], isError: true };
    const { data, error } = await supabase.rpc("list_provider_reviews", { p_provider: prof.id });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const reviews = (data ?? []).slice(0, limit ?? 20).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      reviewer_name: r.reviewer_name,
      is_detailed: r.is_detailed,
      completeness_score: r.completeness_score,
      created_at: r.created_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(reviews, null, 2) }],
      structuredContent: { username: prof.username, reviews },
    };
  },
});
