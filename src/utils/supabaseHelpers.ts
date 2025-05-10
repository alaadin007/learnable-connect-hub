
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

// Add a helper function to provide fallback data for analytics
export function getFallbackAnalyticsData() {
  return {
    summary: {
      activeStudents: 45,
      totalSessions: 324,
      totalQueries: 1250,
      avgSessionMinutes: 32.5,
    },
    performance: {
      total_assessments: 24,
      students_with_submissions: 38,
      total_students: 45,
      avg_submissions_per_assessment: 15.7,
      avg_score: 78.4,
      completion_rate: 87.2,
      student_participation_rate: 91.3,
    }
  };
}

// Mock data helper functions to avoid triggering database policy issues
export function getMockAssessments(limit: number = 5): Assessment[] {
  const subjects = ["Mathematics", "Science", "History", "English", "Computer Science", "Art"];
  const mockAssessments: Assessment[] = [];
  
  for (let i = 0; i < limit; i++) {
    const dueOffset = Math.floor(Math.random() * 14) + 1; // 1-14 days from now
    mockAssessments.push({
      id: `mock-${i}`,
      title: `${subjects[i % subjects.length]} Assessment ${i + 1}`,
      description: `This is a mock assessment for ${subjects[i % subjects.length]}`,
      due_date: new Date(Date.now() + 86400000 * dueOffset).toISOString(),
      created_at: new Date().toISOString(),
      teacher_id: `mock-teacher-${i}`,
      school_id: 'mock-school',
      subject: subjects[i % subjects.length],
      max_score: 100,
      teacher: {
        full_name: "Demo Teacher"
      },
      submission: i % 3 === 0 ? {
        id: `mock-submission-${i}`,
        score: Math.floor(Math.random() * 30) + 70, // 70-100
        completed: true,
        submitted_at: new Date().toISOString()
      } : undefined
    });
  }
  
  return mockAssessments;
}

export function getMockLectures(limit: number = 5): Lecture[] {
  const subjects = ["Mathematics", "Science", "History", "English", "Computer Science"];
  const mockLectures: Lecture[] = [];
  
  for (let i = 0; i < limit; i++) {
    mockLectures.push({
      id: `mock-${i}`,
      title: `Introduction to ${subjects[i % subjects.length]} ${i + 1}`,
      description: `An introductory lecture on ${subjects[i % subjects.length]}`,
      video_url: "https://example.com/video.mp4",
      thumbnail_url: null,
      duration_minutes: 30 + (i * 5),
      teacher_id: `mock-teacher-${i}`,
      school_id: 'mock-school',
      subject: subjects[i % subjects.length],
      created_at: new Date().toISOString()
    });
  }
  
  return mockLectures;
}

export type SchoolId = Database['public']['Tables']['schools']['Row']['id'];
export type UserId = Database['public']['Tables']['profiles']['Row']['id'];
export type DocumentId = Database['public']['Tables']['documents']['Row']['id'];
