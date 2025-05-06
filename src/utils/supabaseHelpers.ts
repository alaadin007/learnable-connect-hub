
/**
 * Utility functions to help handle Supabase responses and type safety issues
 */

// Type guard to check if a response is an error
export const isSupabaseError = (obj: any): boolean => {
  return obj && typeof obj === 'object' && 'error' in obj && obj.error !== null;
};

// Type guard to check if a response contains data (not an error)
export const isDataResponse = <T = any>(obj: any): obj is { data: T; error: null } => {
  return obj && typeof obj === 'object' && 'data' in obj && !isSupabaseError(obj);
};

// Type guard to check if an object has a specific property
export const hasProperty = <T extends object, K extends string>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> => {
  return obj !== null && typeof obj === 'object' && prop in obj;
};

// Safe access to object properties
export const safelyGetProperty = <T, K extends keyof T>(obj: T | null | undefined, key: K): T[K] | undefined => {
  if (!obj) return undefined;
  if (!hasProperty(obj, key as string)) return undefined;
  return obj[key];
};

// Helper to safely extract data from a Supabase query response
export const extractSupabaseData = <T>(response: { data: T | null, error: Error | null }): T | null => {
  if (isSupabaseError(response)) {
    console.error('Supabase query error:', response.error);
    return null;
  }
  return response.data;
};

// Convert string to UUID safely for database queries
export const asUUID = (id: string | undefined): string => {
  if (!id) return '00000000-0000-0000-0000-000000000000';
  return id;
};

// Ensure a value is a valid UUID for Supabase queries
export const ensureUUID = (id: string | undefined): string => {
  if (!id) return null as unknown as string;
  return id;
};

// Safe mapper for Supabase array results
export const safelyMapSupabaseData = <T, R>(
  data: T[] | null | undefined,
  mapper: (item: T) => R,
  requiredProps: (keyof T)[] = []
): R[] => {
  if (!data || !Array.isArray(data)) return [];
  
  return data
    .filter(item => 
      requiredProps.length === 0 || isValidData(item, requiredProps)
    )
    .map(mapper);
};

// Type assertion helper for Supabase data objects
export const isValidData = <T extends object>(obj: any, requiredProps: (keyof T)[]): obj is T => {
  if (!obj || typeof obj !== 'object') return false;
  
  return requiredProps.every(prop => 
    prop in obj && obj[prop] !== undefined
  );
};

// Helper to safely extract data from a query response
export const safelyExtractData = <T>(response: any): T[] => {
  if (isSupabaseError(response)) {
    console.error("Error in response:", response.error || "Unknown error");
    return [];
  }
  
  if (!Array.isArray(response.data)) {
    console.error("Data is not an array:", response.data);
    return [];
  }
  
  return response.data as T[];
};

// Helper for non-null items
export const isNonNullable = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

// Helper to validate student object
export const isValidStudent = (student: any): student is { 
  id: string; 
  school_id: string; 
  status: string; 
  created_at: string; 
} => {
  return student && 
    typeof student === 'object' && 
    'id' in student &&
    'school_id' in student &&
    'status' in student &&
    'created_at' in student;
};

// Helper to validate profile object
export const isValidProfile = (profile: any): profile is {
  id: string;
  full_name: string | null;
} => {
  return profile && 
    typeof profile === 'object' && 
    'id' in profile &&
    'full_name' in profile;
};

// Helper for strict type checking on teacher invitations
export const isValidInvitation = (item: any): item is {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
} => {
  return item &&
    typeof item === 'object' &&
    'id' in item &&
    'email' in item &&
    'status' in item &&
    'created_at' in item &&
    'expires_at' in item;
};

// Helper for validating file items
export const isValidFileItem = (item: any): item is {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
  processing_status: string;
} => {
  return item && 
    typeof item === 'object' && 
    'id' in item && 
    'filename' in item && 
    'file_type' in item && 
    'file_size' in item && 
    'created_at' in item && 
    'storage_path' in item && 
    'processing_status' in item;
};

// Helper to safely cast to any (use sparingly!)
export const safeAnyCast = <T>(value: unknown): T => {
  return value as T;
};

/**
 * Utility to cast values for use with Supabase's strongly typed methods
 * Use this to bypass TypeScript errors when you're sure the data is correct
 */
export const asSupabaseParam = <T>(value: any): T => {
  return value as T;
};

/**
 * All-in-one helper to safely process Supabase responses
 */
export const processSupabaseResult = <T, R>(
  response: any, 
  dataProcessor: (data: T[]) => R, 
  onError?: (error: any) => void
): R | null => {
  if (isSupabaseError(response)) {
    console.error("Supabase error:", response.error);
    if (onError) onError(response.error);
    return null;
  }
  
  if (!Array.isArray(response.data)) {
    console.error("Expected array data but got:", response.data);
    return null;
  }
  
  return dataProcessor(response.data as T[]);
};

/**
 * Helper to safely check if a field exists on a record
 */
export const hasField = <T extends object>(obj: T, field: string): boolean => {
  return obj !== null && typeof obj === 'object' && field in obj;
};
