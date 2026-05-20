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
      admin_notifications: {
        Row: {
          admin_id: string
          body: string
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          notification_type: string
          title: string
        }
        Insert: {
          admin_id: string
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_type?: string
          title: string
        }
        Update: {
          admin_id?: string
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          notification_type?: string
          title?: string
        }
        Relationships: []
      }
      admin_sent_notifications: {
        Row: {
          body: string
          channels: string[]
          created_at: string
          filters: Json
          id: string
          recipient_count: number
          scheduled_for: string | null
          sent_at: string | null
          sent_by: string
          status: string
          title: string
        }
        Insert: {
          body: string
          channels?: string[]
          created_at?: string
          filters?: Json
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by: string
          status?: string
          title: string
        }
        Update: {
          body?: string
          channels?: string[]
          created_at?: string
          filters?: Json
          id?: string
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string
          status?: string
          title?: string
        }
        Relationships: []
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
          token_hash: string | null
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
          token_hash?: string | null
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
          token_hash?: string | null
        }
        Relationships: []
      }
      beta_referrals: {
        Row: {
          awarded_at: string | null
          created_at: string
          id: string
          points_awarded: number
          referred_request_id: string | null
          referred_tester_id: string | null
          referrer_tester_id: string
          status: string
        }
        Insert: {
          awarded_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          referred_request_id?: string | null
          referred_tester_id?: string | null
          referrer_tester_id: string
          status?: string
        }
        Update: {
          awarded_at?: string | null
          created_at?: string
          id?: string
          points_awarded?: number
          referred_request_id?: string | null
          referred_tester_id?: string | null
          referrer_tester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_referrals_referred_request_id_fkey"
            columns: ["referred_request_id"]
            isOneToOne: false
            referencedRelation: "beta_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_referrals_referred_tester_id_fkey"
            columns: ["referred_tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beta_referrals_referrer_tester_id_fkey"
            columns: ["referrer_tester_id"]
            isOneToOne: false
            referencedRelation: "beta_testers"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          language: string | null
          motivation: string | null
          name: string
          referred_by_code: string | null
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
          referred_by_code?: string | null
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
          referred_by_code?: string | null
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
          difficulty_score: number
          errors_count: number
          id: string
          rage_clicks_count: number
          started_at: string | null
          status: string
          task_id: string | null
          tester_id: string | null
          time_on_task: number
          time_spent_seconds: number | null
        }
        Insert: {
          completed_at?: string | null
          difficulty_score?: number
          errors_count?: number
          id?: string
          rage_clicks_count?: number
          started_at?: string | null
          status?: string
          task_id?: string | null
          tester_id?: string | null
          time_on_task?: number
          time_spent_seconds?: number | null
        }
        Update: {
          completed_at?: string | null
          difficulty_score?: number
          errors_count?: number
          id?: string
          rage_clicks_count?: number
          started_at?: string | null
          status?: string
          task_id?: string | null
          tester_id?: string | null
          time_on_task?: number
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
          current_level: string
          first_login_shown: boolean
          id: string
          joined_at: string | null
          last_active_at: string | null
          points_earned: number
          recording_consent: boolean | null
          referral_code: string | null
          session_count: number | null
          tasks_abandoned: number | null
          tasks_completed: number | null
          tasks_total: number | null
          tester_type: string
          user_id: string | null
        }
        Insert: {
          beta_phase?: string | null
          current_level?: string
          first_login_shown?: boolean
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          points_earned?: number
          recording_consent?: boolean | null
          referral_code?: string | null
          session_count?: number | null
          tasks_abandoned?: number | null
          tasks_completed?: number | null
          tasks_total?: number | null
          tester_type: string
          user_id?: string | null
        }
        Update: {
          beta_phase?: string | null
          current_level?: string
          first_login_shown?: boolean
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          points_earned?: number
          recording_consent?: boolean | null
          referral_code?: string | null
          session_count?: number | null
          tasks_abandoned?: number | null
          tasks_completed?: number | null
          tasks_total?: number | null
          tester_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      challenges: {
        Row: {
          bonus_points: number
          category_filter: string | null
          challenge_type: string
          completed_at: string | null
          created_at: string
          current_count: number
          description: string | null
          ends_at: string
          id: string
          starts_at: string
          status: string
          student_id: string
          subject_filter: string | null
          target_count: number
          title: string
          updated_at: string
        }
        Insert: {
          bonus_points?: number
          category_filter?: string | null
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          current_count?: number
          description?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
          student_id: string
          subject_filter?: string | null
          target_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          bonus_points?: number
          category_filter?: string | null
          challenge_type?: string
          completed_at?: string | null
          created_at?: string
          current_count?: number
          description?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
          student_id?: string
          subject_filter?: string | null
          target_count?: number
          title?: string
          updated_at?: string
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
      co_guardians: {
        Row: {
          can_approve_rewards: boolean | null
          can_edit_lessons: boolean | null
          can_receive_sos: boolean | null
          can_view_progress: boolean | null
          created_at: string | null
          guardian_id: string
          id: string
          invited_by: string
          is_full_access: boolean | null
          student_id: string
        }
        Insert: {
          can_approve_rewards?: boolean | null
          can_edit_lessons?: boolean | null
          can_receive_sos?: boolean | null
          can_view_progress?: boolean | null
          created_at?: string | null
          guardian_id: string
          id?: string
          invited_by: string
          is_full_access?: boolean | null
          student_id: string
        }
        Update: {
          can_approve_rewards?: boolean | null
          can_edit_lessons?: boolean | null
          can_receive_sos?: boolean | null
          can_view_progress?: boolean | null
          created_at?: string | null
          guardian_id?: string
          id?: string
          invited_by?: string
          is_full_access?: boolean | null
          student_id?: string
        }
        Relationships: []
      }
      currency_settings: {
        Row: {
          created_at: string
          currency_code: string
          currency_symbol: string
          id: string
          points_per_unit: number
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          id?: string
          points_per_unit?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency_code?: string
          currency_symbol?: string
          id?: string
          points_per_unit?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: []
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
      digital_checks: {
        Row: {
          amount_points: number
          check_number: string
          currency_amount: number
          currency_code: string
          currency_symbol: string
          id: string
          issued_at: string
          memo: string | null
          redeemed_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount_points: number
          check_number: string
          currency_amount: number
          currency_code?: string
          currency_symbol?: string
          id?: string
          issued_at?: string
          memo?: string | null
          redeemed_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount_points?: number
          check_number?: string
          currency_amount?: number
          currency_code?: string
          currency_symbol?: string
          id?: string
          issued_at?: string
          memo?: string | null
          redeemed_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: []
      }
      educator_group_students: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          notes: string | null
          student_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          notes?: string | null
          student_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          notes?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "educator_group_students_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "educator_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      educator_groups: {
        Row: {
          academic_year: string | null
          color: string | null
          created_at: string
          description: string | null
          educator_id: string
          grade_level: string | null
          group_type: string
          id: string
          name: string
          subject: string | null
        }
        Insert: {
          academic_year?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          educator_id: string
          grade_level?: string | null
          group_type: string
          id?: string
          name: string
          subject?: string | null
        }
        Update: {
          academic_year?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          educator_id?: string
          grade_level?: string | null
          group_type?: string
          id?: string
          name?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "educator_groups_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
      }
      educator_invites: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          parent_id: string
          permissions: Json
          status: string
          student_id: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email: string
          parent_id: string
          permissions?: Json
          status?: string
          student_id?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          parent_id?: string
          permissions?: Json
          status?: string
          student_id?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      educator_parent_invites: {
        Row: {
          created_at: string
          educator_id: string
          expires_at: string
          id: string
          parent_email: string
          status: string
          student_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          educator_id: string
          expires_at?: string
          id?: string
          parent_email: string
          status?: string
          student_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          educator_id?: string
          expires_at?: string
          id?: string
          parent_email?: string
          status?: string
          student_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "educator_parent_invites_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
      }
      educator_requests: {
        Row: {
          created_at: string
          email: string
          expertise: string | null
          id: string
          message: string | null
          name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          expertise?: string | null
          id?: string
          message?: string | null
          name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          expertise?: string | null
          id?: string
          message?: string | null
          name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      educator_students: {
        Row: {
          can_edit_schedule: boolean
          can_receive_sos: boolean
          can_use_ai_tutor: boolean
          can_view_checkins: boolean
          can_view_reports: boolean
          created_at: string
          educator_id: string
          id: string
          student_id: string
        }
        Insert: {
          can_edit_schedule?: boolean
          can_receive_sos?: boolean
          can_use_ai_tutor?: boolean
          can_view_checkins?: boolean
          can_view_reports?: boolean
          created_at?: string
          educator_id: string
          id?: string
          student_id: string
        }
        Update: {
          can_edit_schedule?: boolean
          can_receive_sos?: boolean
          can_use_ai_tutor?: boolean
          can_view_checkins?: boolean
          can_view_reports?: boolean
          created_at?: string
          educator_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "educator_students_educator_id_fkey"
            columns: ["educator_id"]
            isOneToOne: false
            referencedRelation: "educators"
            referencedColumns: ["id"]
          },
        ]
      }
      educators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
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
      guardian_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string
          invitee_email: string
          permissions: Json | null
          status: string
          student_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by: string
          invitee_email: string
          permissions?: Json | null
          status?: string
          student_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string
          invitee_email?: string
          permissions?: Json | null
          status?: string
          student_id?: string
          token_hash?: string
        }
        Relationships: []
      }
      impersonation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          parent_id: string
          student_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          parent_id: string
          student_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: []
      }
      inbox_messages: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string
          parent_id: string
          read_at: string | null
          source_id: string | null
          student_id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type: string
          parent_id: string
          read_at?: string | null
          source_id?: string | null
          student_id: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string
          parent_id?: string
          read_at?: string | null
          source_id?: string | null
          student_id?: string
          title?: string
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
      merge_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          reason: string | null
          requester_id: string
          resolved_at: string | null
          source_email: string
          status: string
          target_email: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requester_id: string
          resolved_at?: string | null
          source_email: string
          status?: string
          target_email: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requester_id?: string
          resolved_at?: string | null
          source_email?: string
          status?: string
          target_email?: string
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
      platform_errors: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          error_message: string
          error_stack: string | null
          id: string
          is_beta_tester: boolean
          page_path: string | null
          resolved: boolean
          user_id: string | null
          user_role: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          is_beta_tester?: boolean
          page_path?: string | null
          resolved?: boolean
          user_id?: string | null
          user_role?: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          is_beta_tester?: boolean
          page_path?: string | null
          resolved?: boolean
          user_id?: string | null
          user_role?: string
        }
        Relationships: []
      }
      point_settings: {
        Row: {
          action_key: string
          created_at: string
          enabled: boolean
          id: string
          points: number
          student_id: string
          updated_at: string
        }
        Insert: {
          action_key: string
          created_at?: string
          enabled?: boolean
          id?: string
          points?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          action_key?: string
          created_at?: string
          enabled?: boolean
          id?: string
          points?: number
          student_id?: string
          updated_at?: string
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
          username: string
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
          username: string
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
          username?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_link_tokens: {
        Row: {
          chat_id: number | null
          created_at: string
          expires_at: string
          id: string
          token: string
          token_hash: string | null
          used: boolean
          user_id: string
        }
        Insert: {
          chat_id?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          token_hash?: string | null
          used?: boolean
          user_id: string
        }
        Update: {
          chat_id?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          token_hash?: string | null
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          category: string | null
          created_at: string
          feedback_type: string
          id: string
          is_beta_tester: boolean
          message: string | null
          page_path: string | null
          rating: number | null
          screenshot_url: string | null
          status: string
          user_id: string
          user_role: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          is_beta_tester?: boolean
          message?: string | null
          page_path?: string | null
          rating?: number | null
          screenshot_url?: string | null
          status?: string
          user_id: string
          user_role?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          is_beta_tester?: boolean
          message?: string | null
          page_path?: string | null
          rating?: number | null
          screenshot_url?: string | null
          status?: string
          user_id?: string
          user_role?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_my_account: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_username: { Args: { p_display_name: string }; Returns: string }
      get_co_guardian_students: {
        Args: { _guardian_id: string }
        Returns: {
          academic_year: string
          address: string
          created_at: string
          date_of_birth: string
          display_name: string
          enrollment_date: string
          grade_level: number
          language_pref: string
          monitoring_enabled: boolean
          nationality: string
          parent_email: string
          parent_id: string
          parent_name: string
          parent_whatsapp: string
          profile_photo_url: string
          student_id: string
          student_whatsapp: string
          timezone: string
          updated_at: string
        }[]
      }
      get_educator_student_summary: {
        Args: { _student_id: string }
        Returns: {
          academic_year: string
          created_at: string
          display_name: string
          grade_level: number
          language_pref: string
          monitoring_enabled: boolean
          profile_photo_url: string
          student_id: string
          timezone: string
          updated_at: string
        }[]
      }
      get_my_role: { Args: never; Returns: string }
      get_my_student_id: { Args: never; Returns: string }
      get_my_student_record: {
        Args: never
        Returns: {
          academic_year: string
          created_at: string
          display_name: string
          grade_level: number
          language_pref: string
          monitoring_enabled: boolean
          profile_photo_url: string
          student_id: string
          timezone: string
          updated_at: string
        }[]
      }
      get_points_balance: { Args: { _student_id: string }; Returns: number }
      get_student_id_by_parent: {
        Args: { _parent_id: string; _student_id: string }
        Returns: boolean
      }
      has_educator_permission: {
        Args: { _permission: string; _student_id: string; _user_id: string }
        Returns: boolean
      }
      has_guardian_permission: {
        Args: { permission: string; sid: string; uid: string }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      increment_rate_limit: {
        Args: {
          p_function_name: string
          p_limit: number
          p_user_id: string
          p_window_start: string
        }
        Returns: Json
      }
      is_my_educator_student: {
        Args: { _student_id: string }
        Returns: boolean
      }
      is_my_student: { Args: { _student_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      redeem_reward: {
        Args: { _points_spent: number; _reward_id: string; _student_id: string }
        Returns: undefined
      }
      remove_user_role: {
        Args: { old_role: string; target_uid: string }
        Returns: undefined
      }
      request_check: {
        Args: { _memo?: string; _points: number; _student_id: string }
        Returns: string
      }
      set_user_role: {
        Args: { new_role: string; target_uid: string }
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
