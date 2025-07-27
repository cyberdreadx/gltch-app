export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          avatar_url: string | null
          bluesky_did: string
          bluesky_handle: string
          created_at: string
          custom_tags: string[] | null
          display_name: string | null
          id: string
          is_verified: boolean | null
          joined_at: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bluesky_did: string
          bluesky_handle: string
          created_at?: string
          custom_tags?: string[] | null
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          joined_at?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bluesky_did?: string
          bluesky_handle?: string
          created_at?: string
          custom_tags?: string[] | null
          display_name?: string | null
          id?: string
          is_verified?: boolean | null
          joined_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          banner_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          icon_url: string | null
          id: string
          member_count: number | null
          name: string
          post_count: number | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          icon_url?: string | null
          id?: string
          member_count?: number | null
          name: string
          post_count?: number | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          icon_url?: string | null
          id?: string
          member_count?: number | null
          name?: string
          post_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      community_hashtags: {
        Row: {
          boost_factor: number | null
          community_id: string | null
          created_at: string
          hashtag: string
          id: string
        }
        Insert: {
          boost_factor?: number | null
          community_id?: string | null
          created_at?: string
          hashtag: string
          id?: string
        }
        Update: {
          boost_factor?: number | null
          community_id?: string | null
          created_at?: string
          hashtag?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_hashtags_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_feeds: {
        Row: {
          algorithm_type: string
          created_at: string
          created_by: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          updated_at: string
        }
        Insert: {
          algorithm_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          algorithm_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      post_engagement: {
        Row: {
          bluesky_likes: number | null
          community_score: number | null
          created_at: string
          gltch_downvotes: number | null
          gltch_upvotes: number | null
          id: string
          last_updated: string
          post_uri: string
          trending_score: number | null
        }
        Insert: {
          bluesky_likes?: number | null
          community_score?: number | null
          created_at?: string
          gltch_downvotes?: number | null
          gltch_upvotes?: number | null
          id?: string
          last_updated?: string
          post_uri: string
          trending_score?: number | null
        }
        Update: {
          bluesky_likes?: number | null
          community_score?: number | null
          created_at?: string
          gltch_downvotes?: number | null
          gltch_upvotes?: number | null
          id?: string
          last_updated?: string
          post_uri?: string
          trending_score?: number | null
        }
        Relationships: []
      }
      post_votes: {
        Row: {
          bluesky_like_record: string | null
          created_at: string
          id: string
          post_uri: string
          updated_at: string
          user_id: string
          vote_type: string
        }
        Insert: {
          bluesky_like_record?: string | null
          created_at?: string
          id?: string
          post_uri: string
          updated_at?: string
          user_id: string
          vote_type: string
        }
        Update: {
          bluesky_like_record?: string | null
          created_at?: string
          id?: string
          post_uri?: string
          updated_at?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          bluesky_access_jwt: string | null
          bluesky_did: string | null
          bluesky_handle: string | null
          bluesky_refresh_jwt: string | null
          created_at: string
          display_name: string | null
          id: string
          is_gltch_native: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          bluesky_access_jwt?: string | null
          bluesky_did?: string | null
          bluesky_handle?: string | null
          bluesky_refresh_jwt?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_gltch_native?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          bluesky_access_jwt?: string | null
          bluesky_did?: string | null
          bluesky_handle?: string | null
          bluesky_refresh_jwt?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_gltch_native?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_communities: {
        Row: {
          community_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_communities_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
