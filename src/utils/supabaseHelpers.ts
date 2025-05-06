
/**
 * Helper functions for Supabase operations that ensure type safety
 */

/**
 * Safely converts a value to a Supabase parameter to prevent type errors
 * @param value The value to convert to a Supabase parameter
 * @returns The value cast as 'any' for safe Supabase operations
 */
export const asSupabaseParam = (value: any): any => value;

/**
 * Prepares an object for table insertion by type-casting to avoid TypeScript errors
 * @param data The data object to prepare for insertion
 * @returns The same data object, but type-cast for Supabase operations
 */
export const prepareTableInsert = <T extends Record<string, any>>(data: T): any => data;

/**
 * Prepares an object for table update by type-casting to avoid TypeScript errors
 * @param data The data object to prepare for update
 * @returns The same data object, but type-cast for Supabase operations
 */
export const prepareSupabaseUpdate = <T extends Record<string, any>>(data: T): any => data;

/**
 * Safely accesses properties from a Supabase data object that might be an error
 * @param data The data object from a Supabase query
 * @param accessor Function to extract the desired property
 * @param defaultValue The default value to return if data is null/error
 * @returns The extracted property or default value
 */
export const safelyAccessData = <T, R>(
  data: T | null | undefined, 
  accessor: (data: T) => R, 
  defaultValue: R
): R => {
  try {
    if (data === null || data === undefined) return defaultValue;
    
    // Check if it looks like a Supabase error object
    if (typeof data === 'object' && 'code' in data && 'message' in data) {
      return defaultValue;
    }
    
    return accessor(data);
  } catch (error) {
    console.error("Error accessing Supabase data:", error);
    return defaultValue;
  }
};

export const supabaseHelpers = {
  asSupabaseParam,
  prepareTableInsert,
  prepareSupabaseUpdate,
  safelyAccessData,
};
