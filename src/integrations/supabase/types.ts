export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_disputes: {
        Row: {
          contact_email: string
          counter_evidence: string | null
          created_at: string
          id: string
          provider_id: string
          reason: string
          review_id: string
          review_type: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_email: string
          counter_evidence?: string | null
          created_at?: string
          id?: string
          provider_id: string
          reason: string
          review_id: string
          review_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string
          counter_evidence?: string | null
          created_at?: string
          id?: string
          provider_id?: string
          reason?: string
          review_id?: string
          review_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_disputes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      claims_requests: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          profile_id: string
          status: string
          verification_method: string
          verification_value: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id: string
          status?: string
          verification_method: string
          verification_value?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          profile_id?: string
          status?: string
          verification_method?: string
          verification_value?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imported_testimonials: {
        Row: {
          caption: string
          created_at: string
          display_order: number
          id: string
          media_type: string
          photo_url: string | null
          provider_user_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          caption: string
          created_at?: string
          display_order?: number
          id?: string
          media_type: string
          photo_url?: string | null
          provider_user_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          caption?: string
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          photo_url?: string | null
          provider_user_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      marketplace_waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reads: {
        Row: {
          last_read_at: string
          last_read_message_id: string | null
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          last_read_message_id?: string | null
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          last_read_message_id?: string | null
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_last_read_message_id_fkey"
            columns: ["last_read_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_user_a_fkey"
            columns: ["user_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_user_b_fkey"
            columns: ["user_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          created_at: string
          id: string
          reply_to_id: string | null
          sender_id: string
          thread_id: string
          voice_duration_ms: number | null
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          reply_to_id?: string | null
          sender_id: string
          thread_id: string
          voice_duration_ms?: number | null
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          reply_to_id?: string | null
          sender_id?: string
          thread_id?: string
          voice_duration_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_clicks: {
        Row: {
          clicked_at: string
          clicked_by_user_id: string | null
          clicked_ip: string | null
          clicker_country: string | null
          id: string
          offer_id: string
          referrer: string | null
        }
        Insert: {
          clicked_at?: string
          clicked_by_user_id?: string | null
          clicked_ip?: string | null
          clicker_country?: string | null
          id?: string
          offer_id: string
          referrer?: string | null
        }
        Update: {
          clicked_at?: string
          clicked_by_user_id?: string | null
          clicked_ip?: string | null
          clicker_country?: string | null
          id?: string
          offer_id?: string
          referrer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_clicks_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          cta_label: string
          cta_link: string | null
          description: string
          free_for_testimonial: boolean
          hosted_on_hirevy: boolean
          id: string
          is_active: boolean
          is_pinned: boolean
          offer_tier: string | null
          outbound_click_count: number
          price_cents: number | null
          price_max_cents: number | null
          pricing_model: string
          priority: number
          provider_id: string
          secondary_link: string | null
          secondary_link_label: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          category: string
          cover_url?: string | null
          created_at?: string
          cta_label?: string
          cta_link?: string | null
          description?: string
          free_for_testimonial?: boolean
          hosted_on_hirevy?: boolean
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          offer_tier?: string | null
          outbound_click_count?: number
          price_cents?: number | null
          price_max_cents?: number | null
          pricing_model?: string
          priority?: number
          provider_id: string
          secondary_link?: string | null
          secondary_link_label?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          category?: string
          cover_url?: string | null
          created_at?: string
          cta_label?: string
          cta_link?: string | null
          description?: string
          free_for_testimonial?: boolean
          hosted_on_hirevy?: boolean
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          offer_tier?: string | null
          outbound_click_count?: number
          price_cents?: number | null
          price_max_cents?: number | null
          pricing_model?: string
          priority?: number
          provider_id?: string
          secondary_link?: string | null
          secondary_link_label?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          follower_count: number
          id: string
          instagram_url: string | null
          is_claimed: boolean
          linkedin_url: string | null
          notified_first_review_received: boolean
          notified_first_review_submitted: boolean
          notified_tier: string
          paid_offer_limit: number
          pinned_review_id: string | null
          plan: string
          rating_sum: number
          review_count: number
          score_sum: number
          service_category: string | null
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          username: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          id: string
          instagram_url?: string | null
          is_claimed?: boolean
          linkedin_url?: string | null
          notified_first_review_received?: boolean
          notified_first_review_submitted?: boolean
          notified_tier?: string
          paid_offer_limit?: number
          pinned_review_id?: string | null
          plan?: string
          rating_sum?: number
          review_count?: number
          score_sum?: number
          service_category?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          username: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          id?: string
          instagram_url?: string | null
          is_claimed?: boolean
          linkedin_url?: string | null
          notified_first_review_received?: boolean
          notified_first_review_submitted?: boolean
          notified_tier?: string
          paid_offer_limit?: number
          pinned_review_id?: string | null
          plan?: string
          rating_sum?: number
          review_count?: number
          score_sum?: number
          service_category?: string | null
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          username?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      proof_access_requests: {
        Row: {
          created_at: string
          id: string
          proof_review_id: string
          requester_email: string | null
          requester_message: string | null
          requester_user_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          proof_review_id: string
          requester_email?: string | null
          requester_message?: string | null
          requester_user_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          proof_review_id?: string
          requester_email?: string | null
          requester_message?: string | null
          requester_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_access_requests_proof_review_id_fkey"
            columns: ["proof_review_id"]
            isOneToOne: false
            referencedRelation: "proof_backed_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_backed_reviews: {
        Row: {
          amount_paid_bracket: string | null
          body: string
          completeness_score: number
          created_at: string
          disputed_at: string | null
          engagement_ended_month: number | null
          engagement_ended_year: number | null
          engagement_ongoing: boolean
          engagement_started_month: number
          engagement_started_year: number
          engagement_type: string
          id: string
          is_disputed: boolean
          proof_file_count: number
          proof_file_paths: string[]
          provider_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
          reviewer_user_id: string
        }
        Insert: {
          amount_paid_bracket?: string | null
          body: string
          completeness_score?: number
          created_at?: string
          disputed_at?: string | null
          engagement_ended_month?: number | null
          engagement_ended_year?: number | null
          engagement_ongoing?: boolean
          engagement_started_month: number
          engagement_started_year: number
          engagement_type: string
          id?: string
          is_disputed?: boolean
          proof_file_count?: number
          proof_file_paths?: string[]
          provider_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
          reviewer_user_id: string
        }
        Update: {
          amount_paid_bracket?: string | null
          body?: string
          completeness_score?: number
          created_at?: string
          disputed_at?: string | null
          engagement_ended_month?: number | null
          engagement_ended_year?: number | null
          engagement_ongoing?: boolean
          engagement_started_month?: number
          engagement_started_year?: number
          engagement_type?: string
          id?: string
          is_disputed?: boolean
          proof_file_count?: number
          proof_file_paths?: string[]
          provider_id?: string
          rating?: number
          reviewer_email?: string
          reviewer_name?: string
          reviewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_backed_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      review_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          provider_id: string
          review_id: string
          review_type: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          provider_id: string
          review_id: string
          review_type: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          provider_id?: string
          review_id?: string
          review_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string
          completeness_score: number
          created_at: string
          id: string
          provider_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
        }
        Insert: {
          body?: string
          completeness_score?: number
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
        }
        Update: {
          body?: string
          completeness_score?: number
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          reviewer_email?: string
          reviewer_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unclaimed_reviews: {
        Row: {
          amount_paid_bracket: string | null
          body: string
          coach_name: string
          completeness_score: number
          created_at: string
          evidence_paths: string[]
          id: string
          instagram_handle: string | null
          offer_url: string | null
          purchased: boolean
          rating: number
          reviewer_email: string
          strength_tier: string
        }
        Insert: {
          amount_paid_bracket?: string | null
          body: string
          coach_name: string
          completeness_score?: number
          created_at?: string
          evidence_paths?: string[]
          id?: string
          instagram_handle?: string | null
          offer_url?: string | null
          purchased?: boolean
          rating: number
          reviewer_email: string
          strength_tier?: string
        }
        Update: {
          amount_paid_bracket?: string | null
          body?: string
          coach_name?: string
          completeness_score?: number
          created_at?: string
          evidence_paths?: string[]
          id?: string
          instagram_handle?: string | null
          offer_url?: string | null
          purchased?: boolean
          rating?: number
          reviewer_email?: string
          strength_tier?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_unclaimed_profile:
        | {
            Args: {
              p_bio: string
              p_display_name: string
              p_instagram_url: string
              p_linkedin_url: string
              p_service_category: string
              p_tiktok_url: string
              p_twitter_url: string
              p_username: string
              p_website_url: string
              p_youtube_url: string
            }
            Returns: {
              id: string
              username: string
            }[]
          }
        | {
            Args: {
              p_avatar_url?: string
              p_bio: string
              p_display_name: string
              p_instagram_url: string
              p_linkedin_url: string
              p_service_category: string
              p_tiktok_url: string
              p_twitter_url: string
              p_username: string
              p_website_url: string
              p_youtube_url: string
            }
            Returns: {
              id: string
              username: string
            }[]
          }
      admin_delete_unclaimed_profile: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      admin_list_unclaimed_profiles: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          service_category: string
          username: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          review_count: number
          username: string
        }[]
      }
      admin_stats: { Args: never; Returns: Json }
      compute_review_score: {
        Args: {
          p_amount_filled: boolean
          p_body: string
          p_offer_filled: boolean
          p_photo_count: number
          p_purchased: boolean
        }
        Returns: number
      }
      get_or_create_thread: { Args: { other_user: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      list_provider_reviews: {
        Args: { p_provider: string }
        Returns: {
          body: string
          completeness_score: number
          created_at: string
          id: string
          provider_id: string
          rating: number
          reviewer_name: string
        }[]
      }
      record_offer_click: {
        Args: {
          p_clicked_ip?: string
          p_clicker_country?: string
          p_offer_id: string
          p_referrer?: string
        }
        Returns: undefined
      }
      tier_for_review_count: { Args: { c: number }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
