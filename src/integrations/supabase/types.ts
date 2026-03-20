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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          criteria_met_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          student_id: string
          type: string
        }
        Insert: {
          created_at?: string
          criteria_met_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          student_id: string
          type?: string
        }
        Update: {
          created_at?: string
          criteria_met_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          student_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          log_date: string
          notes: string | null
          score: number | null
          started_at: string | null
          status: string
          student_id: string
          track_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id: string
          track_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          log_date?: string
          notes?: string | null
          score?: number | null
          started_at?: string | null
          status?: string
          student_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "activity_logs_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "subject_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          student_id: string
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          student_id: string
          subject?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          student_id?: string
          subject?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          blocks_done: number
          comment: string | null
          focus: string
          id: string
          mood: string
          need_help: boolean
          student_id: string
          timestamp: string
        }
        Insert: {
          blocks_done?: number
          comment?: string | null
          focus: string
          id?: string
          mood: string
          need_help?: boolean
          student_id: string
          timestamp?: string
        }
        Update: {
          blocks_done?: number
          comment?: string | null
          focus?: string
          id?: string
          mood?: string
          need_help?: boolean
          student_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      curriculum_map: {
        Row: {
          created_at: string
          difficulty: string | null
          estimated_minutes: number | null
          grade_level: number
          language_support_tip: string | null
          lesson_title: string
          map_id: string
          platform_link: string | null
          platform_name: string | null
          platform_note: string | null
          subject: string
          time4learning_path_hint: string | null
          unit_or_chapter: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string | null
          estimated_minutes?: number | null
          grade_level?: number
          language_support_tip?: string | null
          lesson_title: string
          map_id?: string
          platform_link?: string | null
          platform_name?: string | null
          platform_note?: string | null
          subject: string
          time4learning_path_hint?: string | null
          unit_or_chapter?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string | null
          estimated_minutes?: number | null
          grade_level?: number
          language_support_tip?: string | null
          lesson_title?: string
          map_id?: string
          platform_link?: string | null
          platform_name?: string | null
          platform_note?: string | null
          subject?: string
          time4learning_path_hint?: string | null
          unit_or_chapter?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_plan: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          block_order: number
          created_at: string
          end_time: string
          id: string
          map_id: string | null
          notes: string | null
          plan_date: string
          self_rating: number | null
          start_time: string
          status: string
          student_id: string
          subject: string
          time4learning_score: number | null
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          block_order?: number
          created_at?: string
          end_time: string
          id?: string
          map_id?: string | null
          notes?: string | null
          plan_date: string
          self_rating?: number | null
          start_time: string
          status?: string
          student_id: string
          subject: string
          time4learning_score?: number | null
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          block_order?: number
          created_at?: string
          end_time?: string
          id?: string
          map_id?: string | null
          notes?: string | null
          plan_date?: string
          self_rating?: number | null
          start_time?: string
          status?: string
          student_id?: string
          subject?: string
          time4learning_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "curriculum_map"
            referencedColumns: ["map_id"]
          },
          {
            foreignKeyName: "daily_plan_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      flagged_inputs: {
        Row: {
          flag_reason: string | null
          flagged_at: string | null
          id: string
          input_length: number | null
          student_id: string | null
        }
        Insert: {
          flag_reason?: string | null
          flagged_at?: string | null
          id?: string
          input_length?: number | null
          student_id?: string | null
        }
        Update: {
          flag_reason?: string | null
          flagged_at?: string | null
          id?: string
          input_length?: number | null
          student_id?: string | null
        }
        Relationships: []
      }
      learning_tools: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_suggested: boolean
          name: string
          student_id: string
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_suggested?: boolean
          name: string
          student_id: string
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_suggested?: boolean
          name?: string
          student_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          channel: string
          content: string
          id: string
          provider_message_id: string | null
          recipient: string
          status: string | null
          timestamp: string
          type: string
          user_id: string | null
        }
        Insert: {
          channel: string
          content: string
          id?: string
          provider_message_id?: string | null
          recipient: string
          status?: string | null
          timestamp?: string
          type: string
          user_id?: string | null
        }
        Update: {
          channel?: string
          content?: string
          id?: string
          provider_message_id?: string | null
          recipient?: string
          status?: string | null
          timestamp?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      parent_settings: {
        Row: {
          created_at: string
          id: string
          notification_channel: string
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
          whatsapp_enabled: boolean
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notification_channel?: string
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notification_channel?: string
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_enabled?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adult_confirmed: boolean
          adult_confirmed_at: string | null
          created_at: string
          deletion_warning_sent_at: string | null
          display_name: string
          id: string
          language_pref: string
          last_active_at: string | null
          onboarding_complete: boolean
          onboarding_step: number
          reengagement_sent_at: string | null
          role: string
          student_id: string | null
        }
        Insert: {
          adult_confirmed?: boolean
          adult_confirmed_at?: string | null
          created_at?: string
          deletion_warning_sent_at?: string | null
          display_name: string
          id: string
          language_pref?: string
          last_active_at?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          reengagement_sent_at?: string | null
          role?: string
          student_id?: string | null
        }
        Update: {
          adult_confirmed?: boolean
          adult_confirmed_at?: string | null
          created_at?: string
          deletion_warning_sent_at?: string | null
          display_name?: string
          id?: string
          language_pref?: string
          last_active_at?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          reengagement_sent_at?: string | null
          role?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          student_id: string
          subscription: Json
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          subscription: Json
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          subscription?: Json
          user_agent?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          function_name: string
          id: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          function_name: string
          id?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          function_name?: string
          id?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reward_points: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          reference_id: string | null
          source: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          reference_id?: string | null
          source?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          reference_id?: string | null
          source?: string
          student_id?: string
        }
        Relationships: []
      }
      reward_redemptions: {
        Row: {
          created_at: string
          fulfilled_at: string | null
          id: string
          points_spent: number
          reward_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          points_spent: number
          reward_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          points_spent?: number
          reward_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_catalog: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          icon: string
          id: string
          name: string
          point_cost: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string
          id?: string
          name: string
          point_cost?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          icon?: string
          id?: string
          name?: string
          point_cost?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_templates: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          is_builtin: boolean
          name: string
          parent_id: string
          student_id: string | null
          updated_at: string
        }
        Insert: {
          blocks: Json
          created_at?: string
          id?: string
          is_builtin?: boolean
          name: string
          parent_id: string
          student_id?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          is_builtin?: boolean
          name?: string
          parent_id?: string
          student_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          academic_year: string | null
          address: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string
          enrollment_date: string | null
          grade_level: number
          language_pref: string
          monitoring_enabled: boolean
          nationality: string | null
          parent_email: string | null
          parent_id: string | null
          parent_name: string | null
          parent_whatsapp: string | null
          profile_photo_url: string | null
          student_id: string
          student_whatsapp: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name: string
          enrollment_date?: string | null
          grade_level?: number
          language_pref?: string
          monitoring_enabled?: boolean
          nationality?: string | null
          parent_email?: string | null
          parent_id?: string | null
          parent_name?: string | null
          parent_whatsapp?: string | null
          profile_photo_url?: string | null
          student_id: string
          student_whatsapp?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string
          enrollment_date?: string | null
          grade_level?: number
          language_pref?: string
          monitoring_enabled?: boolean
          nationality?: string | null
          parent_email?: string | null
          parent_id?: string | null
          parent_name?: string | null
          parent_whatsapp?: string | null
          profile_photo_url?: string | null
          student_id?: string
          student_whatsapp?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      subject_tracks: {
        Row: {
          category: string
          color: string
          created_at: string
          daily_target: number
          enabled: boolean
          icon: string
          id: string
          name: string
          student_id: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          daily_target?: number
          enabled?: boolean
          icon?: string
          id?: string
          name: string
          student_id: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          daily_target?: number
          enabled?: boolean
          icon?: string
          id?: string
          name?: string
          student_id?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_tracks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_points: {
        Args: {
          _points: number
          _reason: string
          _reference_id?: string
          _source?: string
          _student_id: string
        }
        Returns: undefined
      }
      clear_ai_history: {
        Args: { p_student_id: string; p_subject: string }
        Returns: undefined
      }
      delete_my_account: { Args: never; Returns: undefined }
      get_my_role: { Args: never; Returns: string }
      get_my_student_id: { Args: never; Returns: string }
      get_points_balance: { Args: { _student_id: string }; Returns: number }
      get_student_id_by_parent: {
        Args: { _parent_id: string; _student_id: string }
        Returns: boolean
      }
      increment_rate_limit: {
        Args: {
          p_function_name: string
          p_limit: number
          p_user_id: string
          p_window_start: string
        }
        Returns: Json
      }
      is_my_student: { Args: { _student_id: string }; Returns: boolean }
      redeem_reward: {
        Args: { _points_spent: number; _reward_id: string; _student_id: string }
        Returns: undefined
      }
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
