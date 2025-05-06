/**
 * Helper functions for Supabase operations that ensure type safety
 */

/**
 * Safely converts a value to a Supabase parameter to prevent type errors
 * @param value The value to convert to a Supabase parameter
 * @returns The value cast as 'any' for safe Supabase operations
 */
export const asSupabaseParam = <T>(value: T): any => value;

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
 * Type guard to check if an object is a Supabase error response
 * @param obj The object to check
 * @returns True if the object appears to be a Supabase error
 */
export const isSupabaseError = (obj: any): boolean => {
  return obj && typeof obj === 'object' && ('error' in obj || 'code' in obj || 'message' in obj);
};

/**
 * Type guard to check if the response is a data response and not an error
 * @param response The response to check
 * @returns True if the response has data, false if it's an error
 */
export const isDataResponse = <T>(response: any): response is { id: string } & T => {
  return response && typeof response === 'object' && !isSupabaseError(response);
};

/**
 * Type guard to check if a file item is valid
 * @param item The file item to check
 * @returns True if the file item is valid
 */
export const isValidFileItem = (item: any): boolean => {
  return item && typeof item === 'object' && 'id' in item && 'filename' in item && !isSupabaseError(item);
};

/**
 * Type guard to check if the invitation is valid
 * @param invitation The invitation to check
 * @returns True if the invitation is valid
 */
export const isValidInvitation = (invitation: any): boolean => {
  return invitation && typeof invitation === 'object' && 'id' in invitation && 'email' in invitation && !isSupabaseError(invitation);
};

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
    if (isSupabaseError(data)) {
      return defaultValue;
    }
    
    return accessor(data);
  } catch (error) {
    console.error("Error accessing Supabase data:", error);
    return defaultValue;
  }
};

/**
 * Safely cast any type of Supabase response to the expected type for consistent handling
 * @param data Response data that might be an error or the expected type
 * @returns Safely cast data or null if it's an error or invalid
 */
export const safelyCastData = <T>(data: any): T | null => {
  if (!data || isSupabaseError(data)) {
    return null;
  }
  return data as T;
};

/**
 * Checks if a value is a non-null object with expected properties
 * Useful for validating items in Supabase response arrays
 * @param item The item to check
 * @param requiredProps Array of property names that should exist on the item
 * @returns True if the item is valid, false otherwise
 */
export const isValidObject = (item: any, requiredProps: string[] = []): boolean => {
  if (!item || typeof item !== 'object') return false;
  if (isSupabaseError(item)) return false;
  
  // If no specific props are required, just check that it's a non-null object
  if (requiredProps.length === 0) return true;
  
  // Otherwise check that all required props exist
  return requiredProps.every(prop => prop in item);
};

/**
 * Helper to safely convert Supabase function return values to the expected type
 * @param value The value returned from a Supabase function
 * @returns The value cast to the expected type, or a suitable default
 */
export const asTypedValue = <T>(value: any, defaultValue: T): T => {
  if (value === null || value === undefined) return defaultValue;
  try {
    return value as T;
  } catch {
    return defaultValue;
  }
};

export const supabaseHelpers = {
  asSupabaseParam,
  prepareTableInsert,
  prepareSupabaseUpdate,
  safelyAccessData,
  isDataResponse,
  isValidFileItem,
  isValidInvitation,
  isSupabaseError,
  safelyCastData,
  isValidObject,
  asTypedValue
};

export default supabaseHelpers;
