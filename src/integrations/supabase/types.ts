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
      admin_users: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      app_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_message: boolean
          message: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_message?: boolean
          message: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_message?: boolean
          message?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contributor_profiles: {
        Row: {
          availability_hours: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          detailed_skills: Json | null
          email: string | null
          full_name: string | null
          github_username: string | null
          id: string
          location: string | null
          onboarding_completed: boolean | null
          phone: string | null
          portfolio_url: string | null
          preferred_role: string | null
          professional_interests: string | null
          remote_only: boolean | null
          skills: string[] | null
          state: string | null
        }
        Insert: {
          availability_hours?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          detailed_skills?: Json | null
          email?: string | null
          full_name?: string | null
          github_username?: string | null
          id: string
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_role?: string | null
          professional_interests?: string | null
          remote_only?: boolean | null
          skills?: string[] | null
          state?: string | null
        }
        Update: {
          availability_hours?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          detailed_skills?: Json | null
          email?: string | null
          full_name?: string | null
          github_username?: string | null
          id?: string
          location?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_role?: string | null
          professional_interests?: string | null
          remote_only?: boolean | null
          skills?: string[] | null
          state?: string | null
        }
        Relationships: []
      }
      contributor_stats: {
        Row: {
          active_projects: number | null
          active_tasks: number | null
          average_rating: number | null
          completed_tasks: number | null
          created_at: string | null
          id: string
          messages: number | null
          pending_reviews: number | null
          total_tasks: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_projects?: number | null
          active_tasks?: number | null
          average_rating?: number | null
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          messages?: number | null
          pending_reviews?: number | null
          total_tasks?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_projects?: number | null
          active_tasks?: number | null
          average_rating?: number | null
          completed_tasks?: number | null
          created_at?: string | null
          id?: string
          messages?: number | null
          pending_reviews?: number | null
          total_tasks?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contributors: {
        Row: {
          availability: string | null
          avatar_url: string | null
          created_at: string | null
          experience_level: string | null
          hourly_rate: number | null
          id: string
          location: string | null
          name: string
          skills: string[] | null
        }
        Insert: {
          availability?: string | null
          avatar_url?: string | null
          created_at?: string | null
          experience_level?: string | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          name: string
          skills?: string[] | null
        }
        Update: {
          availability?: string | null
          avatar_url?: string | null
          created_at?: string | null
          experience_level?: string | null
          hourly_rate?: number | null
          id?: string
          location?: string | null
          name?: string
          skills?: string[] | null
        }
        Relationships: []
      }
      daily_updates: {
        Row: {
          created_at: string
          id: string
          key_developments: string[]
          opportunities: string[] | null
          project_id: string
          risks_identified: string[] | null
          summary: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_developments?: string[]
          opportunities?: string[] | null
          project_id: string
          risks_identified?: string[] | null
          summary: string
        }
        Update: {
          created_at?: string
          id?: string
          key_developments?: string[]
          opportunities?: string[] | null
          project_id?: string
          risks_identified?: string[] | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_message_at: string
          message_count: number | null
          project_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          project_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_message_at?: string
          message_count?: number | null
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          created_at: string | null
          due_date: string | null
          feedback_text: string | null
          id: string
          project_id: string
          provider_id: string
          recipient_id: string
          request_type: string
          status: string
        }
        Insert: {
          created_at?: string | null
          due_date?: string | null
          feedback_text?: string | null
          id?: string
          project_id: string
          provider_id: string
          recipient_id: string
          request_type?: string
          status?: string
        }
        Update: {
          created_at?: string | null
          due_date?: string | null
          feedback_text?: string | null
          id?: string
          project_id?: string
          provider_id?: string
          recipient_id?: string
          request_type?: string
          status?: string
        }
        Relationships: []
      }
      founder_analytics: {
        Row: {
          active_projects: number
          created_at: string | null
          funding_goal: number
          funding_progress: number
          id: string
          investor_interests: number
          team_members: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_projects?: number
          created_at?: string | null
          funding_goal?: number
          funding_progress?: number
          id?: string
          investor_interests?: number
          team_members?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_projects?: number
          created_at?: string | null
          funding_goal?: number
          funding_progress?: number
          id?: string
          investor_interests?: number
          team_members?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      founder_connections: {
        Row: {
          connected_at: string
          founder_id: string
          id: string
          message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string
          founder_id: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string
          founder_id?: string
          id?: string
          message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      founder_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string | null
          full_name: string | null
          headline: string | null
          id: string
          industry: string | null
          onboarding_completed: boolean | null
          skills: string[] | null
          updated_at: string | null
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          headline?: string | null
          id: string
          industry?: string | null
          onboarding_completed?: boolean | null
          skills?: string[] | null
          updated_at?: string | null
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          onboarding_completed?: boolean | null
          skills?: string[] | null
          updated_at?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      founder_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["founder_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["founder_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["founder_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      founder_tasks: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          company_name: string
          created_at: string
          date: string
          equity: number | null
          id: string
          notes: string | null
          project_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          company_name: string
          created_at?: string
          date: string
          equity?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          company_name?: string
          created_at?: string
          date?: string
          equity?: number | null
          id?: string
          notes?: string | null
          project_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_watchlist: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          notes: string | null
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          notes?: string | null
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_watchlist_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string | null
          id: string
          industry: string | null
          investment_focus: string[] | null
          investment_stage: string | null
          location: string | null
          name: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          investment_focus?: string[] | null
          investment_stage?: string | null
          location?: string | null
          name: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          investment_focus?: string[] | null
          investment_stage?: string | null
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          description: string
          equity_offered: number | null
          expires_at: string | null
          id: string
          project_id: string | null
          role_type: string | null
          skills_required: string[] | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          equity_offered?: number | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          role_type?: string | null
          skills_required?: string[] | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          equity_offered?: number | null
          expires_at?: string | null
          id?: string
          project_id?: string | null
          role_type?: string | null
          skills_required?: string[] | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string | null
          achievements: Json | null
          availability_hours: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          company_name: string | null
          contact_info: Json | null
          contributor_info: Json | null
          contributor_profile_complete: boolean | null
          country: string | null
          created_at: string
          detailed_skills: Json | null
          education: Json | null
          email: string | null
          firm_name: string | null
          founder_profile_complete: boolean | null
          founderInfo: Json | null
          full_name: string | null
          github_username: string | null
          headline: string | null
          id: string
          industry: string | null
          investment_focus: string | null
          investment_interests: string[] | null
          investment_stage: string | null
          investor_profile_complete: boolean | null
          investorinfo: Json | null
          is_public: boolean | null
          last_sign_in: string | null
          location: string | null
          max_investment_amount: string | null
          min_investment_amount: string | null
          onboarding_completed: boolean | null
          onboarding_step: string | null
          openai_api_key: string | null
          phone: string | null
          portfolio_url: string | null
          preferred_role: string | null
          professional_interests: string | null
          profile_completed: boolean | null
          projects: Json | null
          rapid_api_key: string | null
          remote_only: boolean | null
          skills: string[] | null
          state: string | null
          user_roles: string[] | null
          user_type: string | null
          username: string | null
          verified_email: boolean | null
          website: string | null
          website_url: string | null
        }
        Insert: {
          account_status?: string | null
          achievements?: Json | null
          availability_hours?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          contact_info?: Json | null
          contributor_info?: Json | null
          contributor_profile_complete?: boolean | null
          country?: string | null
          created_at?: string
          detailed_skills?: Json | null
          education?: Json | null
          email?: string | null
          firm_name?: string | null
          founder_profile_complete?: boolean | null
          founderInfo?: Json | null
          full_name?: string | null
          github_username?: string | null
          headline?: string | null
          id: string
          industry?: string | null
          investment_focus?: string | null
          investment_interests?: string[] | null
          investment_stage?: string | null
          investor_profile_complete?: boolean | null
          investorinfo?: Json | null
          is_public?: boolean | null
          last_sign_in?: string | null
          location?: string | null
          max_investment_amount?: string | null
          min_investment_amount?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          openai_api_key?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_role?: string | null
          professional_interests?: string | null
          profile_completed?: boolean | null
          projects?: Json | null
          rapid_api_key?: string | null
          remote_only?: boolean | null
          skills?: string[] | null
          state?: string | null
          user_roles?: string[] | null
          user_type?: string | null
          username?: string | null
          verified_email?: boolean | null
          website?: string | null
          website_url?: string | null
        }
        Update: {
          account_status?: string | null
          achievements?: Json | null
          availability_hours?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company_name?: string | null
          contact_info?: Json | null
          contributor_info?: Json | null
          contributor_profile_complete?: boolean | null
          country?: string | null
          created_at?: string
          detailed_skills?: Json | null
          education?: Json | null
          email?: string | null
          firm_name?: string | null
          founder_profile_complete?: boolean | null
          founderInfo?: Json | null
          full_name?: string | null
          github_username?: string | null
          headline?: string | null
          id?: string
          industry?: string | null
          investment_focus?: string | null
          investment_interests?: string[] | null
          investment_stage?: string | null
          investor_profile_complete?: boolean | null
          investorinfo?: Json | null
          is_public?: boolean | null
          last_sign_in?: string | null
          location?: string | null
          max_investment_amount?: string | null
          min_investment_amount?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: string | null
          openai_api_key?: string | null
          phone?: string | null
          portfolio_url?: string | null
          preferred_role?: string | null
          professional_interests?: string | null
          profile_completed?: boolean | null
          projects?: Json | null
          rapid_api_key?: string | null
          remote_only?: boolean | null
          skills?: string[] | null
          state?: string | null
          user_roles?: string[] | null
          user_type?: string | null
          username?: string | null
          verified_email?: boolean | null
          website?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      project_discussions: {
        Row: {
          code_snippet: string | null
          created_at: string
          id: string
          is_ai_generated: boolean | null
          message: string
          project_id: string
          thread_id: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          code_snippet?: string | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean | null
          message: string
          project_id: string
          thread_id?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          code_snippet?: string | null
          created_at?: string
          id?: string
          is_ai_generated?: boolean | null
          message?: string
          project_id?: string
          thread_id?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_discussions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_discussions_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      project_documents: {
        Row: {
          created_at: string
          file_path: string
          file_type: string | null
          id: string
          name: string
          project_id: string
          size_bytes: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_type?: string | null
          id?: string
          name: string
          project_id: string
          size_bytes?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_type?: string | null
          id?: string
          name?: string
          project_id?: string
          size_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_interests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          project_id: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          project_id?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_interests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          application_message: string | null
          contribution_areas: string[] | null
          equity_share: number | null
          id: string
          joined_at: string
          project_id: string
          role: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_message?: string | null
          contribution_areas?: string[] | null
          equity_share?: number | null
          id?: string
          joined_at?: string
          project_id: string
          role: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_message?: string | null
          contribution_areas?: string[] | null
          equity_share?: number | null
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          project_id: string
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reviews: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          project_id: string
          review_notes: string | null
          reviewer_id: string
          scheduled_date: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          project_id: string
          review_notes?: string | null
          reviewer_id: string
          scheduled_date: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          project_id?: string
          review_notes?: string | null
          reviewer_id?: string
          scheduled_date?: string
          status?: string
        }
        Relationships: []
      }
      project_roles: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          role: Database["public"]["Enums"]["project_role"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: Database["public"]["Enums"]["project_role"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_roles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_submissions: {
        Row: {
          ai_feedback: Json | null
          business_model: string | null
          created_at: string | null
          description: string | null
          documents: Json | null
          funding_needs: number | null
          id: string
          problem_statement: string | null
          status: string | null
          target_market: string | null
          team_description: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_feedback?: Json | null
          business_model?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          funding_needs?: number | null
          id?: string
          problem_statement?: string | null
          status?: string | null
          target_market?: string | null
          team_description?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_feedback?: Json | null
          business_model?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          funding_needs?: number | null
          id?: string
          problem_statement?: string | null
          status?: string | null
          target_market?: string | null
          team_description?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          checklist: string[] | null
          checklist_items: Json | null
          checklist_progress: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          project_id: string
          review_comment: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee_id?: string | null
          checklist?: string[] | null
          checklist_items?: Json | null
          checklist_progress?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_id: string
          review_comment?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee_id?: string | null
          checklist?: string[] | null
          checklist_items?: Json | null
          checklist_progress?: Json | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          project_id?: string
          review_comment?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_workspaces: {
        Row: {
          created_at: string | null
          id: string
          progress: Json | null
          project_id: string
          resources: Json | null
          team_members: Json | null
          timeline: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          progress?: Json | null
          project_id: string
          resources?: Json | null
          team_members?: Json | null
          timeline?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          progress?: Json | null
          project_id?: string
          resources?: Json | null
          team_members?: Json | null
          timeline?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workspaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          business_model: string | null
          category: string | null
          completed_tasks: number | null
          contributors_count: number | null
          created_at: string
          demo_url: string | null
          description: string
          equity_distribution: Json | null
          expenses: number | null
          funding_required: number | null
          funding_status: string | null
          id: string
          image_url: string | null
          investor_count: number | null
          is_active: boolean | null
          plan: string | null
          problem_statement: string | null
          repository: string | null
          revenue: number | null
          search_vector: unknown | null
          seeking_contributors: boolean | null
          seeking_investors: boolean | null
          skill_requirements: string[] | null
          skills_required: string[] | null
          solution: string | null
          stage: string | null
          status: string
          tags: string[] | null
          target_market: string | null
          task_count: number | null
          team_size: number | null
          title: string
          updated_at: string
          user_id: string
          visibility: string | null
          website: string | null
        }
        Insert: {
          business_model?: string | null
          category?: string | null
          completed_tasks?: number | null
          contributors_count?: number | null
          created_at?: string
          demo_url?: string | null
          description: string
          equity_distribution?: Json | null
          expenses?: number | null
          funding_required?: number | null
          funding_status?: string | null
          id?: string
          image_url?: string | null
          investor_count?: number | null
          is_active?: boolean | null
          plan?: string | null
          problem_statement?: string | null
          repository?: string | null
          revenue?: number | null
          search_vector?: unknown | null
          seeking_contributors?: boolean | null
          seeking_investors?: boolean | null
          skill_requirements?: string[] | null
          skills_required?: string[] | null
          solution?: string | null
          stage?: string | null
          status?: string
          tags?: string[] | null
          target_market?: string | null
          task_count?: number | null
          team_size?: number | null
          title: string
          updated_at?: string
          user_id: string
          visibility?: string | null
          website?: string | null
        }
        Update: {
          business_model?: string | null
          category?: string | null
          completed_tasks?: number | null
          contributors_count?: number | null
          created_at?: string
          demo_url?: string | null
          description?: string
          equity_distribution?: Json | null
          expenses?: number | null
          funding_required?: number | null
          funding_status?: string | null
          id?: string
          image_url?: string | null
          investor_count?: number | null
          is_active?: boolean | null
          plan?: string | null
          problem_statement?: string | null
          repository?: string | null
          revenue?: number | null
          search_vector?: unknown | null
          seeking_contributors?: boolean | null
          seeking_investors?: boolean | null
          skill_requirements?: string[] | null
          skills_required?: string[] | null
          solution?: string | null
          stage?: string | null
          status?: string
          tags?: string[] | null
          target_market?: string | null
          task_count?: number | null
          team_size?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_projects_profile"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          additional_details: string | null
          amount: number
          created_at: string
          id: string
          service_name: string
          status: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          additional_details?: string | null
          amount: number
          created_at?: string
          id?: string
          service_name: string
          status?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          additional_details?: string | null
          amount?: number
          created_at?: string
          id?: string
          service_name?: string
          status?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_feedback: {
        Row: {
          communication_score: number | null
          created_at: string | null
          feedback_text: string | null
          id: string
          provider_id: string
          quality_score: number | null
          ratings: Json
          recipient_id: string
          task_id: string
          teamwork_score: number | null
        }
        Insert: {
          communication_score?: number | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          provider_id: string
          quality_score?: number | null
          ratings?: Json
          recipient_id: string
          task_id: string
          teamwork_score?: number | null
        }
        Update: {
          communication_score?: number | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          provider_id?: string
          quality_score?: number | null
          ratings?: Json
          recipient_id?: string
          task_id?: string
          teamwork_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "task_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string | null
          previous_status: string | null
          task_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          task_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          linkedin_url: string | null
          name: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      test_accounts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          password: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          last_login?: string | null
          password: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          password?: string
          role?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string | null
          event_category: string
          event_details: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_category: string
          event_details?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_category?: string
          event_details?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_memberships: {
        Row: {
          created_at: string
          id: string
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "app_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_feedback: {
        Row: {
          areas_to_improve: string | null
          comments: string | null
          feedback_request_id: string
          id: string
          project_id: string
          provider_id: string
          ratings: Json
          recipient_id: string
          strengths: string | null
          submitted_at: string
        }
        Insert: {
          areas_to_improve?: string | null
          comments?: string | null
          feedback_request_id: string
          id?: string
          project_id: string
          provider_id: string
          ratings?: Json
          recipient_id: string
          strengths?: string | null
          submitted_at?: string
        }
        Update: {
          areas_to_improve?: string | null
          comments?: string | null
          feedback_request_id?: string
          id?: string
          project_id?: string
          provider_id?: string
          ratings?: Json
          recipient_id?: string
          strengths?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_feedback_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "weekly_feedback_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_feedback_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          month: number
          project_id: string
          provider_id: string
          recipient_id: string
          status: string
          week_number: number
          year: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          month: number
          project_id: string
          provider_id: string
          recipient_id: string
          status?: string
          week_number: number
          year: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          month?: number
          project_id?: string
          provider_id?: string
          recipient_id?: string
          status?: string
          week_number?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_feedback_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_is_founder: {
        Args: { user_id: string }
        Returns: boolean
      }
      check_project_access: {
        Args: { project_id: string; requesting_user_id: string }
        Returns: boolean
      }
      create_project: {
        Args: {
          p_user_id: string
          p_title: string
          p_description: string
          p_visibility?: string
          p_category?: string
          p_stage?: string
        }
        Returns: {
          business_model: string | null
          category: string | null
          completed_tasks: number | null
          contributors_count: number | null
          created_at: string
          demo_url: string | null
          description: string
          equity_distribution: Json | null
          expenses: number | null
          funding_required: number | null
          funding_status: string | null
          id: string
          image_url: string | null
          investor_count: number | null
          is_active: boolean | null
          plan: string | null
          problem_statement: string | null
          repository: string | null
          revenue: number | null
          search_vector: unknown | null
          seeking_contributors: boolean | null
          seeking_investors: boolean | null
          skill_requirements: string[] | null
          skills_required: string[] | null
          solution: string | null
          stage: string | null
          status: string
          tags: string[] | null
          target_market: string | null
          task_count: number | null
          team_size: number | null
          title: string
          updated_at: string
          user_id: string
          visibility: string | null
          website: string | null
        }
      }
      create_project_task: {
        Args:
          | {
              p_project_id: string
              p_title: string
              p_description?: string
              p_assignee_id?: string
              p_due_date?: string
              p_status?: string
            }
          | {
              p_project_id: string
              p_title: string
              p_description?: string
              p_assignee_id?: string
              p_due_date?: string
              p_status?: string
              p_created_by?: string
            }
        Returns: {
          assignee_id: string | null
          checklist: string[] | null
          checklist_items: Json | null
          checklist_progress: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          project_id: string
          review_comment: string | null
          status: string
          title: string
          updated_at: string | null
        }
      }
      delete_project: {
        Args:
          | { p_project_id: string }
          | { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      delete_project_task: {
        Args: { p_task_id: string }
        Returns: boolean
      }
      delete_project_with_dependencies: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: boolean
      }
      get_founder_dashboard_data: {
        Args: { p_user_id: string }
        Returns: {
          active_projects: number
          team_members: number
          investor_interests: number
          funding_goal: number
          funding_progress: number
        }[]
      }
      get_investor_company_name: {
        Args: { p_profile: Json }
        Returns: string
      }
      get_investors_count: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_pending_feedback_count: {
        Args: { user_id: string }
        Returns: number
      }
      get_project_interests: {
        Args: { p_project_id: string; p_interest_type?: string }
        Returns: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }[]
      }
      get_project_interests_for_user: {
        Args: { p_project_id: string; p_interest_type: string }
        Returns: {
          created_at: string
          id: string
          message: string | null
          project_id: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }[]
      }
      get_project_members: {
        Args: { p_project_id: string }
        Returns: {
          id: string
          user_id: string
          role: string
          status: string
          full_name: string
          avatar_url: string
          email: string
        }[]
      }
      get_project_tasks: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: {
          assignee_id: string | null
          checklist: string[] | null
          checklist_items: Json | null
          checklist_progress: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          project_id: string
          review_comment: string | null
          status: string
          title: string
          updated_at: string | null
        }[]
      }
      get_project_workspace_details: {
        Args: { p_id: string }
        Returns: {
          id: string
          title: string
          description: string
          repository: string
          website: string
          demo_url: string
          user_id: string
          role: string
        }[]
      }
      get_upcoming_reviews_count: {
        Args: { user_id: string }
        Returns: number
      }
      get_user_founder_roles: {
        Args: { p_user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["founder_role"]
        }[]
      }
      get_user_tasks: {
        Args: { user_id: string }
        Returns: {
          id: string
          project_id: string
          title: string
          status: string
          due_date: string
          created_at: string
          project_title: string
        }[]
      }
      has_founder_role: {
        Args: {
          user_id: string
          check_role: Database["public"]["Enums"]["founder_role"]
        }
        Returns: boolean
      }
      is_contributor_profile_complete: {
        Args: { profile_data: Json }
        Returns: boolean
      }
      is_founder: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { project_id: string; user_id: string }
        Returns: boolean
      }
      update_founder_analytics: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_profile: {
        Args: { p_user_id: string; p_profile_data: Json }
        Returns: Json
      }
      update_project: {
        Args: {
          p_project_id: string
          p_title?: string
          p_description?: string
          p_visibility?: string
          p_category?: string
          p_stage?: string
          p_status?: string
        }
        Returns: {
          business_model: string | null
          category: string | null
          completed_tasks: number | null
          contributors_count: number | null
          created_at: string
          demo_url: string | null
          description: string
          equity_distribution: Json | null
          expenses: number | null
          funding_required: number | null
          funding_status: string | null
          id: string
          image_url: string | null
          investor_count: number | null
          is_active: boolean | null
          plan: string | null
          problem_statement: string | null
          repository: string | null
          revenue: number | null
          search_vector: unknown | null
          seeking_contributors: boolean | null
          seeking_investors: boolean | null
          skill_requirements: string[] | null
          skills_required: string[] | null
          solution: string | null
          stage: string | null
          status: string
          tags: string[] | null
          target_market: string | null
          task_count: number | null
          team_size: number | null
          title: string
          updated_at: string
          user_id: string
          visibility: string | null
          website: string | null
        }
      }
      update_project_task: {
        Args: {
          p_task_id: string
          p_title?: string
          p_description?: string
          p_assignee_id?: string
          p_due_date?: string
          p_status?: string
        }
        Returns: {
          assignee_id: string | null
          checklist: string[] | null
          checklist_items: Json | null
          checklist_progress: Json | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          notes: string | null
          priority: string | null
          project_id: string
          review_comment: string | null
          status: string
          title: string
          updated_at: string | null
        }
      }
      user_has_role: {
        Args: { user_id: string; role_name: string }
        Returns: boolean
      }
    }
    Enums: {
      founder_role: "ceo" | "cto" | "product" | "founder"
      project_role: "owner" | "admin" | "contributor" | "viewer"
      user_role: "entrepreneur" | "contributor" | "investor"
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
      founder_role: ["ceo", "cto", "product", "founder"],
      project_role: ["owner", "admin", "contributor", "viewer"],
      user_role: ["entrepreneur", "contributor", "investor"],
    },
  },
} as const
