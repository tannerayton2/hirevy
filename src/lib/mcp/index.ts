import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchCoaches from "./tools/search-coaches";
import getCoachProfile from "./tools/get-coach-profile";
import listCoachReviews from "./tools/list-coach-reviews";
import getMyProfile from "./tools/get-my-profile";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "aytopus-mcp",
  title: "Aytopus",
  version: "0.1.0",
  instructions:
    "Tools for Aytopus, a review platform for coaches and service providers. Use search_coaches to discover providers by keyword or category, get_coach_profile for a specific @username, list_coach_reviews for verified reviews on a provider, and get_my_profile for the signed-in user's own profile.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchCoaches, getCoachProfile, listCoachReviews, getMyProfile],
});
