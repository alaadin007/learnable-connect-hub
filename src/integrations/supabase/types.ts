export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_keys: {
        Row: {
          api_key: string
          created_at: string | null
          id: string
          service_name: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          created_at?: string | null
          id?: string
          service_name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          created_at?: string | null
          id?: string
          service_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_submissions: {
        Row: {
          assessment_id: string
          completed: boolean | null
          feedback: string | null
          id: string
          score: number | null
          strengths: string[] | null
          student_id: string
          submitted_at: string
          time_spent: number | null
          weaknesses: string[] | null
        }
        Insert: {
          assessment_id: string
          completed?: boolean | null
          feedback?: string | null
          id?: string
          score?: number | null
          strengths?: string[] | null
          student_id: string
          submitted_at?: string
          time_spent?: number | null
          weaknesses?: string[] | null
        }
        Update: {
          assessment_id?: string
          completed?: boolean | null
          feedback?: string | null
          id?: string
          score?: number | null
          strengths?: string[] | null
          student_id?: string
          submitted_at?: string
          time_spent?: number | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_submissions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_performance_metrics"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "fk_student_id"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          max_score: number
          school_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number
          school_id: string
          teacher_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number
          school_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_school_id"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "fk_school_id"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "fk_school_id"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "fk_school_id"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teacher_performance_metrics"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "fk_teacher_id"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          last_message_at: string
          school_id: string
          starred: boolean | null
          summary: string | null
          tags: string[] | null
          title: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          school_id: string
          starred?: boolean | null
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          school_id?: string
          starred?: boolean | null
          summary?: string | null
          tags?: string[] | null
          title?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      document_content: {
        Row: {
          content: string | null
          created_at: string
          document_id: string
          id: string
          processing_status: string
          section_number: number
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          document_id: string
          id?: string
          processing_status?: string
          section_number?: number
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          document_id?: string
          id?: string
          processing_status?: string
          section_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_content_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_size: number
          file_type: string
          filename: string
          id: string
          processing_status: string
          school_id: string | null
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          processing_status?: string
          school_id?: string | null
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          processing_status?: string
          school_id?: string | null
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          feedback_rating: number | null
          id: string
          is_important: boolean | null
          sender: string
          timestamp: string
        }
        Insert: {
          content: string
          conversation_id: string
          feedback_rating?: number | null
          id?: string
          is_important?: boolean | null
          sender: string
          timestamp?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          feedback_rating?: number | null
          id?: string
          is_important?: boolean | null
          sender?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          school_code: string | null
          school_id: string | null
          school_name: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          school_code?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          school_code?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          id: string
          school_name: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          id?: string
          school_name: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          id?: string
          school_name?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          code: string
          contact_email: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          notifications_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          code: string
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notifications_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          code?: string
          contact_email?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notifications_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schools_code_fkey"
            columns: ["code"]
            isOneToOne: true
            referencedRelation: "school_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      session_logs: {
        Row: {
          created_at: string
          id: string
          num_queries: number
          performance_metric: Json | null
          school_id: string
          session_end: string | null
          session_start: string
          topic_or_content_used: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          num_queries?: number
          performance_metric?: Json | null
          school_id: string
          session_end?: string | null
          session_start?: string
          topic_or_content_used?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          num_queries?: number
          performance_metric?: Json | null
          school_id?: string
          session_end?: string | null
          session_start?: string
          topic_or_content_used?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_invites: {
        Row: {
          code: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          school_id: string
          status: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          school_id: string
          status?: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "student_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "student_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "student_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          board: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          level: string | null
          subjects: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          board?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          level?: string | null
          subjects?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          board?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          level?: string | null
          subjects?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      student_progress_history: {
        Row: {
          assessments_taken: number
          avg_score: number
          completion_rate: number
          created_at: string
          id: string
          improvement_rate: number | null
          period_end: string
          period_start: string
          school_id: string
          student_id: string
        }
        Insert: {
          assessments_taken?: number
          avg_score?: number
          completion_rate?: number
          created_at?: string
          id?: string
          improvement_rate?: number | null
          period_end: string
          period_start: string
          school_id: string
          student_id: string
        }
        Update: {
          assessments_taken?: number
          avg_score?: number
          completion_rate?: number
          created_at?: string
          id?: string
          improvement_rate?: number | null
          period_end?: string
          period_start?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "student_progress_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "student_progress_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "student_progress_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_progress_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "student_performance_metrics"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "student_progress_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          id: string
          school_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_invitations: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          school_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          school_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teacher_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teacher_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teacher_invitations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          school_id: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          school_id: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          school_id?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teacher_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teacher_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teacher_invites_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          id: string
          is_supervisor: boolean | null
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_supervisor?: boolean | null
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_supervisor?: boolean | null
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      most_studied_topics: {
        Row: {
          count_of_sessions: number | null
          school_id: string | null
          topic_or_content_used: string | null
          topic_rank: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_analytics_summary: {
        Row: {
          active_students: number | null
          avg_session_minutes: number | null
          latest_session_start: string | null
          school_id: string | null
          school_name: string | null
          total_queries: number | null
          total_sessions: number | null
        }
        Relationships: []
      }
      school_improvement_metrics: {
        Row: {
          avg_monthly_score: number | null
          completion_improvement_rate: number | null
          month: string | null
          monthly_completion_rate: number | null
          school_id: string | null
          school_name: string | null
          score_improvement_rate: number | null
        }
        Relationships: []
      }
      school_performance_metrics: {
        Row: {
          avg_score: number | null
          avg_submissions_per_assessment: number | null
          completion_rate: number | null
          school_id: string | null
          school_name: string | null
          student_participation_rate: number | null
          students_with_submissions: number | null
          total_assessments: number | null
          total_students: number | null
        }
        Relationships: []
      }
      session_query_counts: {
        Row: {
          num_queries: number | null
          school_id: string | null
          session_id: string | null
          session_start: string | null
          topic_or_content_used: string | null
          user_id: string | null
        }
        Insert: {
          num_queries?: number | null
          school_id?: string | null
          session_id?: string | null
          session_start?: string | null
          topic_or_content_used?: string | null
          user_id?: string | null
        }
        Update: {
          num_queries?: number | null
          school_id?: string | null
          session_id?: string | null
          session_start?: string | null
          topic_or_content_used?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_performance_metrics: {
        Row: {
          assessments_completed: number | null
          assessments_taken: number | null
          avg_score: number | null
          avg_time_spent_seconds: number | null
          completion_rate: number | null
          school_id: string | null
          student_id: string | null
          student_name: string | null
          top_strengths: string | null
          top_weaknesses: string | null
          total_submissions: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_weekly_study_time: {
        Row: {
          school_id: string | null
          student_name: string | null
          study_hours: number | null
          user_id: string | null
          week_number: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_performance_metrics: {
        Row: {
          assessments_created: number | null
          avg_student_score: number | null
          avg_submissions_per_assessment: number | null
          completion_rate: number | null
          school_id: string | null
          students_assessed: number | null
          teacher_id: string | null
          teacher_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_analytics_summary"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_improvement_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "school_performance_metrics"
            referencedColumns: ["school_id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_teacher_invitation: {
        Args: { token: string; user_id?: string }
        Returns: boolean
      }
      assign_role: {
        Args: {
          user_id_param: string
          role_param: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      check_if_email_exists: {
        Args: { input_email: string }
        Returns: boolean
      }
      create_session_log: {
        Args: { topic?: string }
        Returns: string
      }
      create_student_invitation: {
        Args: { school_id_param: string }
        Returns: {
          code: string
          expires_at: string
          invite_id: string
        }[]
      }
      end_session_log: {
        Args: { log_id: string; performance_data?: Json }
        Returns: undefined
      }
      generate_invitation_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_school_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_api_key: {
        Args: { service: string }
        Returns: string
      }
      get_current_school_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          school_id: string
          school_name: string
          school_code: string
          contact_email: string
        }[]
      }
      get_school_by_code: {
        Args: { input_code: string }
        Returns: {
          id: string
          name: string
          school_code: string
          active: boolean
        }[]
      }
      get_school_improvement_metrics: {
        Args: { p_school_id: string; p_months_to_include?: number }
        Returns: {
          month: string
          avg_monthly_score: number
          monthly_completion_rate: number
          score_improvement_rate: number
          completion_improvement_rate: number
        }[]
      }
      get_school_name_from_code: {
        Args: { code: string }
        Returns: string
      }
      get_school_performance_metrics: {
        Args: {
          p_school_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          school_id: string
          school_name: string
          total_assessments: number
          students_with_submissions: number
          total_students: number
          avg_submissions_per_assessment: number
          avg_score: number
          completion_rate: number
          student_participation_rate: number
        }[]
      }
      get_student_performance_metrics: {
        Args: {
          p_school_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          student_id: string
          student_name: string
          assessments_taken: number
          avg_score: number
          avg_time_spent_seconds: number
          assessments_completed: number
          completion_rate: number
          top_strengths: string
          top_weaknesses: string
        }[]
      }
      get_teacher_performance_metrics: {
        Args: {
          p_school_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          teacher_id: string
          teacher_name: string
          assessments_created: number
          students_assessed: number
          avg_submissions_per_assessment: number
          avg_student_score: number
          completion_rate: number
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role_by_email: {
        Args: { input_email: string }
        Returns: string
      }
      get_user_roles: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      get_user_school_id: {
        Args: Record<PropertyKey, never> | { user_id?: string }
        Returns: string
      }
      has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      increment_session_query_count: {
        Args: { log_id: string }
        Returns: undefined
      }
      invite_teacher: {
        Args: { teacher_email: string; inviter_id?: string }
        Returns: string
      }
      is_supervisor: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_user_supervisor: {
        Args: { user_id: string }
        Returns: boolean
      }
      populatetestaccountwithsessions: {
        Args: { userid: string; schoolid: string; num_sessions?: number }
        Returns: undefined
      }
      proxy_gemini_request: {
        Args: { prompt: string; model?: string }
        Returns: Json
      }
      proxy_openai_request: {
        Args: { prompt: string; model?: string }
        Returns: Json
      }
      register_school: {
        Args: {
          p_school_name: string
          p_admin_email: string
          p_admin_full_name: string
          p_contact_email?: string
        }
        Returns: {
          school_id: string
          school_code: string
          admin_id: string
        }[]
      }
      remove_role: {
        Args: {
          user_id_param: string
          role_param: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      set_api_key: {
        Args: { service: string; key_value: string }
        Returns: boolean
      }
      update_session_topic: {
        Args: { log_id: string; topic: string }
        Returns: undefined
      }
      verify_school_code: {
        Args: { code: string }
        Returns: boolean
      }
      verify_teacher_invitation: {
        Args: { token: string }
        Returns: {
          invitation_id: string
          school_id: string
          school_name: string
          email: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "school_admin"
        | "teacher_supervisor"
        | "teacher"
        | "student"
        | "system_admin"
      user_role:
        | "school_admin"
        | "teacher_supervisor"
        | "teacher"
        | "student"
        | "system_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "school_admin",
        "teacher_supervisor",
        "teacher",
        "student",
        "system_admin",
      ],
      user_role: [
        "school_admin",
        "teacher_supervisor",
        "teacher",
        "student",
        "system_admin",
      ],
    },
  },
} as const
