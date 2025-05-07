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
  return obj && typeof obj === 'object' && (
    'error' in obj || 
    'code' in obj || 
    'message' in obj ||
    (obj.error === true)
  );
};

/**
 * Type guard to check if the response is a data response and not an error
 * @param response The response to check
 * @returns True if the response has data, false if it's an error
 */
export const isDataResponse = <T>(response: any): response is { id: string } & T => {
  return response && 
         typeof response === 'object' && 
         !isSupabaseError(response) && 
         ('id' in response);
};

/**
 * Type guard to check if a file item is valid
 * @param item The file item to check
 * @returns True if the file item is valid
 */
export const isValidFileItem = (item: any): boolean => {
  return item && 
         typeof item === 'object' && 
         'id' in item && 
         'filename' in item && 
         !isSupabaseError(item);
};

/**
 * Type guard to check if the invitation is valid
 * @param invitation The invitation to check
 * @returns True if the invitation is valid
 */
export const isValidInvitation = (invitation: any): boolean => {
  return invitation && 
         typeof invitation === 'object' && 
         'id' in invitation && 
         'email' in invitation && 
         !isSupabaseError(invitation);
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
  if (value === null || value === undefined || isSupabaseError(value)) return defaultValue;
  try {
    return value as T;
  } catch {
    return defaultValue;
  }
};

/**
 * Helper to safely handle the responses from Supabase queries that might return errors
 * @param response The response from a Supabase query
 * @param defaultValue The default value to return if the response is an error
 * @returns The response data or the default value
 */
export const safelyHandleResponse = <T>(response: any, defaultValue: T): T => {
  if (!response || isSupabaseError(response)) {
    return defaultValue;
  }
  return response as T;
};

/**
 * Safely extract a string ID from a response that might be an error or contain an ID field
 * @param data Response data that might contain an ID
 * @returns The ID as a string or null if not available
 */
export const safelyExtractId = (data: any): string | null => {
  if (!data || isSupabaseError(data) || typeof data !== 'object' || !('id' in data)) {
    return null;
  }
  return String(data.id);
};

/**
 * Safely extract a UUID from a Supabase function response
 * @param data Response data that might be a UUID
 * @returns The UUID as a string or null if not available
 */
export const safelyExtractUuid = (data: any): string | null => {
  if (!data || isSupabaseError(data)) {
    return null;
  }
  
  // If data is directly a string and looks like a UUID
  if (typeof data === 'string') {
    return data;
  }
  
  return null;
};

/**
 * Type guard to check if an array item is valid for safe access
 * @param item The item to check from an array response
 * @returns True if the item is safe to access properties from
 */
export const isSafeArrayItem = (item: any): boolean => {
  return item !== null && 
         typeof item === 'object' && 
         !isSupabaseError(item);
};

/**
 * Helper for safely updating state with a string UUID from Supabase functions
 * @param value The value from a Supabase function
 * @returns A state update action compatible with React's setState
 */
export const toStringStateAction = (value: any): string => {
  if (value === null || value === undefined || isSupabaseError(value)) {
    return '';
  }
  return String(value);
};

/**
 * Improved type checking for use with array data from Supabase
 * First checks if the item is valid, then returns a properly typed value or null
 * @param item Array item from Supabase response
 * @returns A safely typed object or null
 */
export const safeCastArrayItem = <T extends Record<string, any>>(
  item: any, 
  requiredProps: (keyof T)[] = []
): T | null => {
  // First check if the item is a valid object (not null, not an error)
  if (!item || typeof item !== 'object' || isSupabaseError(item)) {
    return null;
  }
  
  // Then check required properties if specified
  if (requiredProps.length > 0) {
    for (const prop of requiredProps) {
      if (!(String(prop) in item)) {
        return null;
      }
    }
  }
  
  // If it passes, return it as the expected type
  return item as T;
};

/**
 * Safely extract a string property from any object, with fallback to default
 * @param obj The object to extract from
 * @param prop The property name to extract
 * @param defaultValue The default value if property doesn't exist
 * @returns Safe string value
 */
export const safeString = (obj: any, prop: string, defaultValue: string = ''): string => {
  if (!obj || typeof obj !== 'object' || !(prop in obj)) {
    return defaultValue;
  }
  return String(obj[prop]);
};

/**
 * Safely extract a number property from any object, with fallback to default
 * @param obj The object to extract from
 * @param prop The property name to extract
 * @param defaultValue The default value if property doesn't exist
 * @returns Safe number value
 */
export const safeNumber = (obj: any, prop: string, defaultValue: number = 0): number => {
  if (!obj || typeof obj !== 'object' || !(prop in obj)) {
    return defaultValue;
  }
  const val = obj[prop];
  return typeof val === 'number' ? val : Number(val) || defaultValue;
};

/**
 * Special helper for supabase API key functions to cast parameters safely
 * @param serviceName The service name to use
 * @returns A safely typed parameter
 */
export const asServiceParam = (serviceName: string): any => {
  return serviceName;
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
  asTypedValue,
  safelyHandleResponse,
  safelyExtractId,
  safelyExtractUuid,
  isSafeArrayItem,
  toStringStateAction,
  safeCastArrayItem,
  safeString,
  safeNumber,
  asServiceParam
};

export default supabaseHelpers;
