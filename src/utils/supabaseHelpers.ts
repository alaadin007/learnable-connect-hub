
import { PostgrestError } from '@supabase/supabase-js';

// Helper type guard to check if data exists and is not an error
export function isDataResponse<T>(
  response: { data: T | null; error: PostgrestError | null }
): response is { data: T; error: null } {
  return response.error === null && response.data !== null;
}

// Helper type guard to check if there's an error
export function isErrorResponse(
  response: { data: any | null; error: PostgrestError | null }
): response is { data: null; error: PostgrestError } {
  return response.error !== null;
}

// Helper to safely get data from a response
export function getDataOrNull<T>(
  response: { data: T | null; error: PostgrestError | null }
): T | null {
  if (isDataResponse(response)) {
    return response.data;
  }
  return null;
}

// Safely extract data from an array response with type guard
export function safelyExtractData<T>(
  data: T | null | undefined | PostgrestError
): T[] {
  if (!data || 'message' in data) {
    return [];
  }
  return Array.isArray(data) ? data : [data] as T[];
}

// Helper to convert string IDs to proper UUIDs for Supabase
export function asUUID(id: string): any {
  return id;
}
