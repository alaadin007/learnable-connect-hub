
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
  role?: string;
}

export type SchoolId = Database['public']['Tables']['schools']['Row']['id'];
export type UserId = Database['public']['Tables']['profiles']['Row']['id'];
export type DocumentId = Database['public']['Tables']['documents']['Row']['id'];
