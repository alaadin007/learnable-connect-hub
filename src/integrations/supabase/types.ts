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
          subject: string | null
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
          subject?: string | null
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
          subject?: string | null
          teacher_id?: string
          title?: string
        }
        Relationships: [
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
      document_summaries: {
        Row: {
          created_at: string
          document_id: string
          id: string
          summary: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          summary: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_summaries_document_id_fkey"
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
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back_text: string
          content_id: string | null
          content_type: string
          created_at: string
          deck_name: string | null
          front_text: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          back_text: string
          content_id?: string | null
          content_type: string
          created_at?: string
          deck_name?: string | null
          front_text: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          back_text?: string
          content_id?: string | null
          content_type?: string
          created_at?: string
          deck_name?: string | null
          front_text?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lecture_notes: {
        Row: {
          created_at: string
          id: string
          lecture_id: string
          notes: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lecture_id: string
          notes: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lecture_id?: string
          notes?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_notes_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          last_watched: string
          lecture_id: string
          progress: number
          student_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          last_watched?: string
          lecture_id: string
          progress?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          last_watched?: string
          lecture_id?: string
          progress?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lecture_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_resources: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          lecture_id: string
          title: string
        }
        Insert: {
          created_at?: string
          file_type: string
          file_url: string
          id?: string
          lecture_id: string
          title: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          lecture_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_resources_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_transcripts: {
        Row: {
          created_at: string
          end_time: number
          id: string
          lecture_id: string
          start_time: number
          text: string
        }
        Insert: {
          created_at?: string
          end_time: number
          id?: string
          lecture_id: string
          start_time: number
          text: string
        }
        Update: {
          created_at?: string
          end_time?: number
          id?: string
          lecture_id?: string
          start_time?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_transcripts_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          school_id: string
          subject: string
          teacher_id: string
          thumbnail_url: string | null
          title: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          school_id: string
          subject: string
          teacher_id: string
          thumbnail_url?: string | null
          title: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          school_id?: string
          subject?: string
          teacher_id?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lectures_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_id: string | null
          attachment_name: string | null
          attachment_type: string | null
          content: string
          conversation_id: string
          feedback_rating: number | null
          id: string
          is_important: boolean | null
          sender: string
          timestamp: string
        }
        Insert: {
          attachment_id?: string | null
          attachment_name?: string | null
          attachment_type?: string | null
          content: string
          conversation_id: string
          feedback_rating?: number | null
          id?: string
          is_important?: boolean | null
          sender: string
          timestamp?: string
        }
        Update: {
          attachment_id?: string | null
          attachment_name?: string | null
          attachment_type?: string | null
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
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_supervisor: boolean | null
          organization: Json | null
          school_code: string | null
          school_id: string | null
          school_name: string | null
          updated_at: string
          user_type: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_supervisor?: boolean | null
          organization?: Json | null
          school_code?: string | null
          school_id?: string | null
          school_name?: string | null
          updated_at?: string
          user_type: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_supervisor?: boolean | null
          organization?: Json | null
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
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          points: number
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          points?: number
          question_text: string
          question_type: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          points?: number
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_option_id: string | null
          submission_id: string
          text_response: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_option_id?: string | null
          submission_id: string
          text_response?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_option_id?: string | null
          submission_id?: string
          text_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assessment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admins: {
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
            foreignKeyName: "school_admins_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_code_logs: {
        Row: {
          code: string
          generated_at: string
          generated_by: string
          id: string
          school_id: string
        }
        Insert: {
          code: string
          generated_at?: string
          generated_by: string
          id?: string
          school_id: string
        }
        Update: {
          code?: string
          generated_at?: string
          generated_by?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_code_logs_school_id_fkey"
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
          school_id: string | null
          school_name: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          id?: string
          school_id?: string | null
          school_name: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          id?: string
          school_id?: string | null
          school_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          code: string
          code_expires_at: string | null
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
          code_expires_at?: string | null
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
          code_expires_at?: string | null
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
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_learning_materials: {
        Row: {
          content_id: string
          content_type: string
          id: string
          note: string | null
          school_id: string
          shared_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          content_id: string
          content_type: string
          id?: string
          note?: string | null
          school_id: string
          shared_at?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          id?: string
          note?: string | null
          school_id?: string
          shared_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_learning_materials_school_id_fkey"
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
            referencedRelation: "schools"
            referencedColumns: ["id"]
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
            foreignKeyName: "students_profiles_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      video_transcripts: {
        Row: {
          created_at: string
          end_time: number | null
          id: string
          start_time: number | null
          text: string
          video_id: string
        }
        Insert: {
          created_at?: string
          end_time?: number | null
          id?: string
          start_time?: number | null
          text: string
          video_id: string
        }
        Update: {
          created_at?: string
          end_time?: number | null
          id?: string
          start_time?: number | null
          text?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          file_size: number | null
          id: string
          processing_status: string
          school_id: string | null
          storage_path: string | null
          title: string
          transcript_status: string | null
          updated_at: string
          user_id: string
          video_type: string
          video_url: string
          youtube_id: string | null
        }
        Insert: {
          created_at?: string
          file_size?: number | null
          id?: string
          processing_status?: string
          school_id?: string | null
          storage_path?: string | null
          title: string
          transcript_status?: string | null
          updated_at?: string
          user_id: string
          video_type: string
          video_url: string
          youtube_id?: string | null
        }
        Update: {
          created_at?: string
          file_size?: number | null
          id?: string
          processing_status?: string
          school_id?: string | null
          storage_path?: string | null
          title?: string
          transcript_status?: string | null
          updated_at?: string
          user_id?: string
          video_type?: string
          video_url?: string
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_teacher_invitation: {
        Args: { token: string; user_id?: string }
        Returns: boolean
      }
      approve_student_direct: {
        Args: { student_id_param: string }
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
      generate_new_school_code: {
        Args: { school_id_param: string }
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
      get_most_studied_topics: {
        Args: { p_school_id: string }
        Returns: {
          topic_or_content_used: string
          count_of_sessions: number
          topic_rank: number
        }[]
      }
      get_profile_safely: {
        Args: { uid?: string }
        Returns: Json
      }
      get_profile_with_organization: {
        Args: { user_id_param?: string }
        Returns: Json
      }
      get_school_analytics_summary: {
        Args: { p_school_id: string }
        Returns: {
          school_id: string
          school_name: string
          active_students: number
          total_sessions: number
          total_queries: number
          avg_session_minutes: number
          latest_session_start: string
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
      get_school_by_id: {
        Args: { school_id_param: string }
        Returns: {
          id: string
          name: string
          code: string
          contact_email: string
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
      get_school_performance_metrics_view: {
        Args: { p_school_id: string }
        Returns: {
          school_id: string
          school_name: string
          total_assessments: number
          total_students: number
          students_with_submissions: number
          student_participation_rate: number
          avg_score: number
          completion_rate: number
          avg_submissions_per_assessment: number
        }[]
      }
      get_session_logs_with_user_details: {
        Args: { school_id_param?: string }
        Returns: {
          id: string
          user_id: string
          school_id: string
          topic_or_content_used: string
          session_start: string
          session_end: string
          num_queries: number
          user_name: string
          user_email: string
        }[]
      }
      get_session_query_counts: {
        Args: { p_school_id: string }
        Returns: {
          session_id: string
          user_id: string
          school_id: string
          topic_or_content_used: string
          session_start: string
          num_queries: number
        }[]
      }
      get_student_metrics_for_school: {
        Args: { school_id_param: string }
        Returns: {
          student_id: string
          student_name: string
          avg_score: number
          assessments_taken: number
          completion_rate: number
          avg_time_spent_seconds: number
          top_strengths: string
          top_weaknesses: string
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
      get_student_performance_metrics_view: {
        Args: { p_school_id?: string }
        Returns: {
          student_id: string
          student_name: string
          school_id: string
          assessments_taken: number
          avg_score: number
          avg_time_spent_seconds: number
          assessments_completed: number
          completion_rate: number
          top_strengths: string
          top_weaknesses: string
        }[]
      }
      get_student_weekly_study_time: {
        Args: { p_school_id: string }
        Returns: {
          user_id: string
          student_name: string
          year: number
          week_number: number
          study_hours: number
        }[]
      }
      get_students_for_school: {
        Args: { school_id_param: string }
        Returns: {
          id: string
          full_name: string
          email: string
          status: string
          created_at: string
        }[]
      }
      get_students_with_profiles: {
        Args: { school_id_param: string }
        Returns: {
          id: string
          full_name: string
          email: string
          status: string
          created_at: string
          last_active: string
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
      get_teacher_performance_metrics_view: {
        Args: { p_school_id?: string }
        Returns: {
          teacher_id: string
          teacher_name: string
          school_id: string
          assessments_created: number
          students_assessed: number
          avg_submissions_per_assessment: number
          avg_student_score: number
          completion_rate: number
        }[]
      }
      get_teachers_for_school: {
        Args: { school_id_param: string }
        Returns: {
          id: string
          full_name: string
          email: string
          is_supervisor: boolean
          created_at: string
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
      get_user_role_safe: {
        Args: { user_id_param?: string }
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
      get_user_school_id_safe: {
        Args: { user_id_param?: string }
        Returns: string
      }
      get_user_school_id_safely: {
        Args: { uid?: string }
        Returns: string
      }
      get_user_settings: {
        Args: { user_id_param: string }
        Returns: {
          max_tokens: number
          temperature: number
          model: string
          show_sources: boolean
        }[]
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
      invite_student_direct: {
        Args: { school_id_param: string }
        Returns: {
          code: string
          expires_at: string
          invite_id: string
        }[]
      }
      invite_teacher: {
        Args: { teacher_email: string; inviter_id?: string }
        Returns: string
      }
      invite_teacher_direct: {
        Args: { teacher_email: string; school_id: string }
        Returns: string
      }
      is_authorized_for_teacher_access: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_same_user_or_supervisor: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_school_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_school_admin_safe: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_supervisor: {
        Args: { user_id?: string }
        Returns: boolean
      }
      is_user_supervisor: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_user_supervisor_safe: {
        Args: { user_id_param?: string }
        Returns: boolean
      }
      is_valid_email: {
        Args: { email: string }
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
      revoke_student_access_direct: {
        Args: { student_id_param: string }
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
      update_user_settings: {
        Args: {
          user_id_param: string
          max_tokens_param: number
          temperature_param: number
          model_param: string
          show_sources_param: boolean
        }
        Returns: boolean
      }
      verify_and_link_school_code: {
        Args: { code: string }
        Returns: {
          valid: boolean
          school_id: string
          school_name: string
        }[]
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
          role: string
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
