import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_coach_profile",
  title: "Get coach profile",
  description:
    "Fetch the public Aytopus profile of a coach or service provider by their username (without the leading @).",
  inputSchema: {
    username: z.string().trim().min(1).max(60).describe("Aytopus username, no @ prefix."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ username }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "username, display_name, bio, service_category, review_count, rating_sum, follower_count, avatar_url, website_url, instagram_url, twitter_url, youtube_url, linkedin_url, tiktok_url, created_at",
      )
      .eq("username", username)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data)
      return {
        content: [{ type: "text", text: `No profile found for @${username}` }],
        isError: true,
      };
    const profile = {
      ...data,
      average_rating:
        data.review_count && data.review_count > 0
          ? Math.round(((data.rating_sum ?? 0) / data.review_count) * 10) / 10
          : null,
      profile_url: `https://hirevy.lovable.app/@${data.username}`,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      structuredContent: { profile },
    };
  },
});
