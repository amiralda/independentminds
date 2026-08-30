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
      achievements: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          milestone: number | null
          student_id: string | null
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          milestone?: number | null
          student_id?: string | null
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          milestone?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          id: string
          messages: Json | null
          student_id: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          messages?: Json | null
          student_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          messages?: Json | null
          student_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_failures: {
        Row: {
          created_at: string
          email_attempted: string | null
          failure_type: string
          id: string
          ip_hint: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email_attempted?: string | null
          failure_type: string
          id?: string
          ip_hint?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email_attempted?: string | null
          failure_type?: string
          id?: string
          ip_hint?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      beta_config: {
        Row: {
          beta_start_date: string | null
          current_testers: number | null
          id: number
          max_testers: number | null
          open_beta_date: string | null
          phase: string
          updated_at: string | null
        }
        Insert: {
          beta_start_date?: string | null
          current_testers?: number | null
          id?: number
          max_testers?: number | null
          open_beta_date?: string | null
          phase?: string
          updated_at?: string | null
        }
        Update: {
          beta_start_date?: string | null
          current_testers?: number | null
          id?: number
          max_testers?: number | null
          open_beta_date?: string | null
          phase?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      beta_events: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          element_selector: string | null
          event_type: string
          feature_name: string | null
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          tester_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          element_selector?: string | null
          event_type: string
          feature_name?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          tester_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          element_selector?: string | null
          event_type?: string
          feature_name?: string | null
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          tester_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_events_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_feedback: {
        Row: {
          browser_info: Json | null
          comment: string | null
          created_at: string | null
          feature_area: string | null
          feedback_type: string
          id: string
          nps_score: number | null
          page_path: string | null
          rating: number | null
          screenshot_url: string | null
          tester_id: string | null
        }
        Insert: {
          browser_info?: Json | null
          comment?: string | null
          created_at?: string | null
          feature_area?: string | null
          feedback_type: string
          id?: string
          nps_score?: number | null
          page_path?: string | null
          rating?: number | null
          screenshot_url?: string | null
          tester_id?: string | null
        }
        Update: {
          browser_info?: Json | null
          comment?: string | null
          created_at?: string | null
          feature_area?: string | null
          feedback_type?: string
          id?: string
          nps_score?: number | null
          page_path?: string | null
          rating?: number | null
          screenshot_url?: string | null
          tester_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_feedback_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invite_logs: {
        Row: {
          channel: string
          error_message: string | null
          id: string
          invite_id: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          channel: string
          error_message?: string | null
          id?: string
          invite_id?: string | null
          sent_at?: string | null
          status: string
        }
        Update: {
          channel?: string
          error_message?: string | null
          id?: string
          invite_id?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_invite_logs_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "beta_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          language: string | null
          notes: string | null
          status: string
          telegram_chat_id: string | null
          tester_type: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          language?: string | null
          notes?: string | null
          status?: string
          telegram_chat_id?: string | null
          tester_type: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          language?: string | null
          notes?: string | null
          status?: string
          telegram_chat_id?: string | null
          tester_type?: string
          token?: string
        }
        Relationships: []
      }
      beta_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          language: string | null
          motivation: string | null
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tester_type: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          language?: string | null
          motivation?: string | null
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tester_type: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          language?: string | null
          motivation?: string | null
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tester_type?: string
        }
        Relationships: []
      }
      beta_sessions: {
        Row: {
          browser: string | null
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          event_count: number | null
          id: string
          language: string | null
          page_count: number | null
          recording_url: string | null
          session_id: string
          started_at: string | null
          tester_id: string | null
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          event_count?: number | null
          id?: string
          language?: string | null
          page_count?: number | null
          recording_url?: string | null
          session_id: string
          started_at?: string | null
          tester_id?: string | null
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          event_count?: number | null
          id?: string
          language?: string | null
          page_count?: number | null
          recording_url?: string | null
          session_id?: string
          started_at?: string | null
          tester_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_sessions_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_task_completions: {
        Row: {
          completed_at: string | null
          id: string
          started_at: string | null
          status: string
          task_id: string | null
          tester_id: string | null
          time_spent_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          task_id?: string | null
          tester_id?: string | null
          time_spent_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          started_at?: string | null
          status?: string
          task_id?: string | null
          tester_id?: string | null
          time_spent_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beta_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "beta_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_task_completions_tester_id_fkey"
            columns: ["tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_tasks: {
        Row: {
          description_key: string
          feature_area: string
          id: string
          is_required: boolean | null
          task_order: number
          tester_type: string
          title_key: string
        }
        Insert: {
          description_key: string
          feature_area: string
          id?: string
          is_required?: boolean | null
          task_order: number
          tester_type: string
          title_key: string
        }
        Update: {
          description_key?: string
          feature_area?: string
          id?: string
          is_required?: boolean | null
          task_order?: number
          tester_type?: string
          title_key?: string
        }
        Relationships: []
      }
      beta_testers: {
        Row: {
          beta_phase: string | null
          id: string
          joined_at: string | null
          last_active_at: string | null
          recording_consent: boolean | null
          session_count: number | null
          tasks_abandoned: number | null
          tasks_completed: number | null
          tasks_total: number | null
          tester_type: string
          user_id: string | null
        }
        Insert: {
          beta_phase?: string | null
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          recording_consent?: boolean | null
          session_count?: number | null
          tasks_abandoned?: number | null
          tasks_completed?: number | null
          tasks_total?: number | null
          tester_type: string
          user_id?: string | null
        }
        Update: {
          beta_phase?: string | null
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          recording_consent?: boolean | null
          session_count?: number | null
          tasks_abandoned?: number | null
          tasks_completed?: number | null
          tasks_total?: number | null
          tester_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string
          id: string
          payload: Json
          stripe_event_id: string | null
          stripe_object_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          stripe_event_id?: string | null
          stripe_object_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          stripe_event_id?: string | null
          stripe_object_id?: string | null
          type?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          checked_in_at: string | null
          focus: number | null
          help_needed: boolean | null
          id: string
          mood: string | null
          note: string | null
          progress: number | null
          student_id: string | null
        }
        Insert: {
          checked_in_at?: string | null
          focus?: number | null
          help_needed?: boolean | null
          id?: string
          mood?: string | null
          note?: string | null
          progress?: number | null
          student_id?: string | null
        }
        Update: {
          checked_in_at?: string | null
          focus?: number | null
          help_needed?: boolean | null
          id?: string
          mood?: string | null
          note?: string | null
          progress?: number | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      co_guardians: {
        Row: {
          can_approve_rewards: boolean | null
          can_edit_lessons: boolean | null
          can_receive_sos: boolean | null
          can_view_progress: boolean | null
          guardian_id: string | null
          id: string
          invited_at: string | null
          is_full_access: boolean | null
          parent_id: string | null
        }
        Insert: {
          can_approve_rewards?: boolean | null
          can_edit_lessons?: boolean | null
          can_receive_sos?: boolean | null
          can_view_progress?: boolean | null
          guardian_id?: string | null
          id?: string
          invited_at?: string | null
          is_full_access?: boolean | null
          parent_id?: string | null
        }
        Update: {
          can_approve_rewards?: boolean | null
          can_edit_lessons?: boolean | null
          can_receive_sos?: boolean | null
          can_view_progress?: boolean | null
          guardian_id?: string | null
          id?: string
          invited_at?: string | null
          is_full_access?: boolean | null
          parent_id?: string | null
        }
        Relationships: []
      }
      daily_plan: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string | null
          id: string
          planned_date: string
          status: string | null
          student_id: string | null
          subject: string
          title: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string | null
          id?: string
          planned_date: string
          status?: string | null
          student_id?: string | null
          subject: string
          title?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string | null
          id?: string
          planned_date?: string
          status?: string | null
          student_id?: string | null
          subject?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_plan_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      flagged_inputs: {
        Row: {
          flagged_at: string | null
          id: string
          input_length: number | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          flagged_at?: string | null
          id?: string
          input_length?: number | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          flagged_at?: string | null
          id?: string
          input_length?: number | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      guardian_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          parent_id: string | null
          status: string | null
          telegram_chat_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          parent_id?: string | null
          status?: string | null
          telegram_chat_id?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          parent_id?: string | null
          status?: string | null
          telegram_chat_id?: string | null
          token?: string
        }
        Relationships: []
      }
      inbox_messages: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          parent_id: string | null
          payload: Json | null
          read_at: string | null
          source_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          parent_id?: string | null
          payload?: Json | null
          read_at?: string | null
          source_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          parent_id?: string | null
          payload?: Json | null
          read_at?: string | null
          source_id?: string | null
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          channel: string | null
          id: string
          message_type: string | null
          parent_id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel?: string | null
          id?: string
          message_type?: string | null
          parent_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string | null
          id?: string
          message_type?: string | null
          parent_id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      parent_settings: {
        Row: {
          id: string
          notification_channel: string | null
          telegram_bot_token: string | null
          telegram_chat_id: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          id: string
          notification_channel?: string | null
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          id?: string
          notification_channel?: string | null
          telegram_bot_token?: string | null
          telegram_chat_id?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          adult_confirmed: boolean | null
          adult_confirmed_at: string | null
          created_at: string | null
          display_name: string | null
          id: string
          language_pref: string | null
          onboarding_complete: boolean
          onboarding_step: number | null
          preferred_language: string | null
          telegram_chat_id: string | null
        }
        Insert: {
          adult_confirmed?: boolean | null
          adult_confirmed_at?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          language_pref?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number | null
          preferred_language?: string | null
          telegram_chat_id?: string | null
        }
        Update: {
          adult_confirmed?: boolean | null
          adult_confirmed_at?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          language_pref?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number | null
          preferred_language?: string | null
          telegram_chat_id?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          subscription: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          subscription: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          subscription?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number | null
          id: string
          user_id: string | null
          window_start: string | null
        }
        Insert: {
          action: string
          count?: number | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Update: {
          action?: string
          count?: number | null
          id?: string
          user_id?: string | null
          window_start?: string | null
        }
        Relationships: []
      }
      reward_points: {
        Row: {
          awarded_at: string | null
          id: string
          points: number
          reason: string | null
          student_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          id?: string
          points: number
          reason?: string | null
          student_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          id?: string
          points?: number
          reason?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_points_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          approved_at: string | null
          id: string
          requested_at: string | null
          reward_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          approved_at?: string | null
          id?: string
          requested_at?: string | null
          reward_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          approved_at?: string | null
          id?: string
          requested_at?: string | null
          reward_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_catalog: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          parent_id: string | null
          point_cost: number
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          point_cost?: number
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          point_cost?: number
          title?: string
        }
        Relationships: []
      }
      schedule_templates: {
        Row: {
          blocks: Json | null
          created_at: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          blocks?: Json | null
          created_at?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          blocks?: Json | null
          created_at?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          current_streak: number | null
          display_name: string
          graduation_date: string | null
          id: string
          language_pref: string | null
          lessons_completed: number | null
          parent_id: string | null
          points_balance: number | null
          student_id: string | null
          total_lessons: number | null
          velocity: number | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          display_name: string
          graduation_date?: string | null
          id?: string
          language_pref?: string | null
          lessons_completed?: number | null
          parent_id?: string | null
          points_balance?: number | null
          student_id?: string | null
          total_lessons?: number | null
          velocity?: number | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          display_name?: string
          graduation_date?: string | null
          id?: string
          language_pref?: string | null
          lessons_completed?: number | null
          parent_id?: string | null
          points_balance?: number | null
          student_id?: string | null
          total_lessons?: number | null
          velocity?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          plan_key: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_key: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_key?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { role: string; user_id: string }; Returns: boolean }
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
