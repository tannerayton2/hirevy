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
      offers: {
        Row: {
          category: string
          cover_url: string | null
          created_at: string
          description: string
          free_for_testimonial: boolean
          id: string
          is_active: boolean
          is_pinned: boolean
          price_cents: number | null
          priority: number
          provider_id: string
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
          description?: string
          free_for_testimonial?: boolean
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          price_cents?: number | null
          priority?: number
          provider_id: string
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
          description?: string
          free_for_testimonial?: boolean
          id?: string
          is_active?: boolean
          is_pinned?: boolean
          price_cents?: number | null
          priority?: number
          provider_id?: string
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
          paid_offer_limit: number
          pinned_review_id: string | null
          plan: string
          rating_sum: number
          review_count: number
          service_category: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          id: string
          paid_offer_limit?: number
          pinned_review_id?: string | null
          plan?: string
          rating_sum?: number
          review_count?: number
          service_category?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          follower_count?: number
          id?: string
          paid_offer_limit?: number
          pinned_review_id?: string | null
          plan?: string
          rating_sum?: number
          review_count?: number
          service_category?: string | null
          updated_at?: string
          username?: string
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
          created_at: string
          id: string
          provider_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          reviewer_email: string
          reviewer_name: string
        }
        Update: {
          body?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      get_or_create_thread: { Args: { other_user: string }; Returns: string }
      is_admin: { Args: { uid: string }; Returns: boolean }
      list_provider_reviews: {
        Args: { p_provider: string }
        Returns: {
          body: string
          created_at: string
          id: string
          provider_id: string
          rating: number
          reviewer_name: string
        }[]
      }
      tier_for_review_count: { Args: { c: number }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
