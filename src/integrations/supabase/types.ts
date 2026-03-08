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
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          role: string
          student_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          role?: string
          student_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
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
      students: {
        Row: {
          created_at: string
          display_name: string
          grade_level: number
          language_pref: string
          parent_email: string | null
          parent_name: string | null
          parent_whatsapp: string | null
          student_id: string
          student_whatsapp: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          grade_level?: number
          language_pref?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_whatsapp?: string | null
          student_id: string
          student_whatsapp?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          grade_level?: number
          language_pref?: string
          parent_email?: string | null
          parent_name?: string | null
          parent_whatsapp?: string | null
          student_id?: string
          student_whatsapp?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: { Args: never; Returns: string }
      get_my_student_id: { Args: never; Returns: string }
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
