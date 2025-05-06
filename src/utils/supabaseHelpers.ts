
/**
 * Utility functions to help handle Supabase responses and type safety issues
 */

// Type guard to check if a response is an error
export const isSupabaseError = (obj: any): boolean => {
  return obj && typeof obj === 'object' && 'error' in obj;
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

// Type assertion helper for Supabase data objects
export const isValidData = <T extends object>(obj: any, requiredProps: (keyof T)[]): obj is T => {
  if (!obj || typeof obj !== 'object') return false;
  
  return requiredProps.every(prop => 
    prop in obj && obj[prop] !== undefined
  );
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

// Helper to safely get data from a Supabase query response
export const extractSupabaseData = <T>(response: { data: T | null, error: Error | null }): T | null => {
  if (response.error) {
    console.error('Supabase query error:', response.error);
    return null;
  }
  return response.data;
};
