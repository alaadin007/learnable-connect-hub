
export interface UserProfile {
  id: string;
  created_at: string;
  full_name: string;
  avatar_url: string;
  user_type: 'student' | 'teacher' | 'school_admin' | 'school';
  school_id: string | null;
}

export interface School {
  id: string;
  created_at: string;
  name: string;
  domain: string;
  logo_url: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone_number: string;
  admin_id: string;
}

export interface Lecture {
  id: string;
  created_at: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  teacher_id: string;
  subject: string;
  school_id: string;
}

export interface LectureResource {
  id: string;
  created_at: string;
  lecture_id: string;
  title: string;
  file_url: string;
  file_type: string;
}

export interface LectureProgress {
  id: string;
  created_at: string;
  lecture_id: string;
  student_id: string;
  progress: number;
  last_watched: string;
  completed: boolean;
}

export interface LectureNote {
  id: string;
  created_at: string;
  lecture_id: string;
  student_id: string;
  notes: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  lecture_id: string;
  text: string;
  start_time: number;  // timestamp in seconds
  end_time: number;    // timestamp in seconds
  created_at: string;
}

// Add missing interfaces that were referenced in other files
export interface TeacherInvitation {
  id: string;
  school_id: string;
  email: string;
  status: 'pending' | 'accepted' | 'expired';
  invitation_token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  role?: string;
}

export interface Student {
  id: string;
  school_id: string;
  created_at: string;
  updated_at: string;
  status: 'pending' | 'active' | 'revoked';
}

export interface Assessment {
  id: string;
  school_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  created_at: string;
  due_date?: string;
  max_score: number;
  subject?: string;
  teacher: {
    full_name: string;
  };
  submission?: {
    id: string;
    score: number | null;
    completed: boolean;
    submitted_at: string;
  };
}
