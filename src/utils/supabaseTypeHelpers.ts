
/**
 * Utility functions for handling Supabase types and query results
 */

import { PostgrestError } from '@supabase/supabase-js';
import { Json } from '@/integrations/supabase/types';

/**
 * Type guard to check if a value is a Supabase error
 */
export function isSupabaseError(value: any): value is PostgrestError {
  return value && 
    typeof value === 'object' && 
    'code' in value &&
    'message' in value &&
    'details' in value;
}

/**
 * Type guard to check if an object has required fields
 */
export function hasRequiredFields<T extends Record<string, any>>(value: any, requiredFields: (keyof T)[]): value is T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (isSupabaseError(value)) return false;
  
  // Check that all required fields exist
  return requiredFields.every(field => field in value);
}

/**
 * Safe cast for database IDs to handle string/uuid issues
 */
export function asDbId(value: string): string {
  return value;
}

/**
 * Cast a value to a column type safely
 */
export function asColumnValue<T>(value: any): T {
  return value as T;
}

// Updated type definitions with all required fields
export interface FileItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  processing_status: string;
  user_id: string;
  created_at: string;
  school_id: string | null;
}

export interface DocumentContent {
  id: string;
  document_id: string;
  content: string;
  section_number: number;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

export interface TeacherInvitation {
  id: string;
  email: string;
  status: string;
  invitation_token: string;
  created_at: string;
  expires_at: string;
  school_id: string;
  created_by: string;
}

export interface TeacherInvite {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
  school_id: string;
  invitation_token: string;
  created_by: string;
}

