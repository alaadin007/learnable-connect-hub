

export interface VideoType {
  id: string;
  user_id: string;
  school_id?: string;
  title: string;
  video_type: 'youtube' | 'lecture';
  youtube_id?: string;
  video_url: string;
  storage_path?: string;
  file_size?: number;
  processing_status: string;
  transcript_status?: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardType {
  id: string;
  user_id: string;
  content_id?: string;
  content_type: 'document' | 'video' | 'other';
  front_text: string;
  back_text: string;
  deck_name?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentSummaryType {
  id: string;
  document_id: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface MessageType {
  id: string;
  conversation_id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  is_important?: boolean;
  feedback_rating?: number;
  attachment_type?: 'document' | 'video';
  attachment_id?: string;
  attachment_name?: string;
}

export interface SharedLearningMaterialType {
  id: string;
  teacher_id: string;
  school_id: string;
  content_id: string;
  content_type: 'document' | 'video';
  note?: string;
  shared_at: string;
  updated_at: string;
}

