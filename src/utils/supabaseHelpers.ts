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
