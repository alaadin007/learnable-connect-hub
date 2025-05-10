
import type { Database } from "@/integrations/supabase/types";

// Type helper for database IDs
export function asDbId(id: string): string {
  return id;
}

// Type helper for safely casting data from Supabase responses
export function castResponseData<T>(data: any): T[] {
  return data as T[];
}

// Type definitions for common database tables
export interface TeacherInvitation {
  id: string;
  email: string;
  status: string;
  invitation_token: string;
  school_id: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  role: string;
}

// Types for lectures system
export interface Lecture {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url?: string | null;
  duration_minutes: number;
  teacher_id: string;
  school_id: string;
  subject: string;
  created_at: string;
}

export interface LectureResource {
  id: string;
  lecture_id: string;
  title: string;
  file_url: string;
  file_type: string;
}

export interface LectureProgress {
  id?: string;
  student_id: string;
  lecture_id: string;
  progress: number;
  last_watched: string;
  completed: boolean;
}

export interface LectureNote {
  id?: string;
  student_id: string;
  lecture_id: string;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface Student {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  school_id?: string;
}

export interface Teacher {
  id: string;
  full_name: string;
  email: string;
  is_supervisor: boolean;
  created_at: string;
  role?: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  teacher_id: string;
  school_id: string;
  subject: string | null;
  max_score: number;
  teacher: {
    full_name: string;
  };
  submission?: {
    id: string;
    score: number | null;
    completed: boolean | null;
    submitted_at: string;
  };
}

export interface AssessmentSubmission {
  id: string;
  assessment_id: string;
  student_id: string;
  score: number | null;
  submitted_at: string;
  completed: boolean;
  time_spent: number | null;
}

export type SchoolId = Database['public']['Tables']['schools']['Row']['id'];
export type UserId = Database['public']['Tables']['profiles']['Row']['id'];
export type DocumentId = Database['public']['Tables']['documents']['Row']['id'];
