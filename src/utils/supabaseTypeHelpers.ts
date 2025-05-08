
/**
 * Utility functions for handling Supabase types and query results
 */

/**
 * Type guard to check if a value is a Supabase error
 * @param value Any value to check
 * @returns Boolean indicating if the value is an error object
 */
export function isSupabaseError(value: any): boolean {
  return value && 
    typeof value === 'object' && 
    'error' in value && 
    value.error === true;
}

/**
 * Type guard to check if an object is a valid database record
 * @param value Any value to check
 * @returns Boolean indicating if the value is a valid record
 */
export function isValidRecord<T extends Record<string, any>>(value: any, requiredFields: (keyof T)[]): value is T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if ('error' in value && value.error === true) return false;
  
  // Check that all required fields exist
  return requiredFields.every(field => field in value);
}

/**
 * Safely handle a Supabase query result by checking for errors
 * @param queryResult Result from a Supabase query
 * @param requiredFields Fields that must exist for a valid result
 * @returns Properly typed result or null if invalid
 */
export function safeQueryResult<T extends Record<string, any>>(
  queryResult: any, 
  requiredFields: (keyof T)[]
): T | null {
  if (!queryResult || isSupabaseError(queryResult)) return null;
  if (isValidRecord<T>(queryResult, requiredFields)) return queryResult;
  return null;
}

/**
 * Map database query results to application types
 * @param data Data from a Supabase query
 * @param mapper Function to map each item
 * @returns Array of mapped items
 */
export function mapQueryResultToAppType<T, R>(
  data: T[] | null | undefined,
  mapper: (item: T) => R
): R[] {
  if (!data || !Array.isArray(data)) return [];
  return data.map(mapper);
}

/**
 * Safe type assertion for database IDs
 * @param value Value to assert as a database ID
 * @returns The value casted to the appropriate type
 */
export function asDbId(value: string): any {
  return value;
}

/**
 * Cast a value to a column type safely
 * @param value Value to cast
 * @returns The value casted to the appropriate type
 */
export function asColumnValue<T>(value: any): T {
  return value as T;
}

export type FileItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  processing_status: string;
  user_id: string;
};

export type DocumentContent = {
  id: string;
  document_id: string;
  content: string;
  section_number: number;
  processing_status: string;
};

export type TeacherInvitation = {
  id: string;
  email: string;
  status: string;
  invitation_token: string;
  created_at: string;
  expires_at: string;
  school_id: string;
  created_by: string;
};
