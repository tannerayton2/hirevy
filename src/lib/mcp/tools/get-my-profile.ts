import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_my_profile",
  title: "Get my Aytopus profile",
  description:
    "Return the authenticated Aytopus user's own profile (username, display name, category, review counts, socials).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "username, display_name, bio, service_category, review_count, rating_sum, follower_count, avatar_url, website_url, instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url, provider_type, role, created_at",
      )
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Profile not found" }], isError: true };
    const profile = {
      ...data,
      average_rating:
        data.review_count && data.review_count > 0
          ? Math.round(((data.rating_sum ?? 0) / data.review_count) * 10) / 10
          : null,
      profile_url: `https://aytopus.com/@${data.username}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: { profile },
    };
  },
});
