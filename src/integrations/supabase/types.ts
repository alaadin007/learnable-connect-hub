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
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          school_code: string | null
          school_name: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          school_code?: string | null
          school_name?: string | null
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          school_code?: string | null
          school_name?: string | null
          updated_at?: string
          user_type?: string
        }
        Relationships: []
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
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
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
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string
          id: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "session_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      create_session_log: {
        Args: { topic?: string }
        Returns: string
      }
      end_session_log: {
        Args: { log_id: string; performance_data?: Json }
        Returns: undefined
      }
      generate_invitation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_school_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_school_name_from_code: {
        Args: { code: string }
        Returns: string
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_school_id: {
        Args: Record<PropertyKey, never>
        Returns: string
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
        Args: { user_id: string }
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
