
import { PostgrestSingleResponse, PostgrestResponse, PostgrestError } from '@supabase/supabase-js';

export interface DataResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: PostgrestError | Error;
  message: string;
}

export type SafeResponse<T> = DataResponse<T> | ErrorResponse;

// Function to check if the response is a success response
export function isDataResponse<T>(response: SafeResponse<T>): response is DataResponse<T> {
  return response && (response as DataResponse<T>).success === true;
}

// Function to check if the response is an error response
export function isErrorResponse(response: SafeResponse<any>): response is ErrorResponse {
  return response && (response as ErrorResponse).success === false;
}

// Safely convert Supabase response to a consistent format
export async function safeResponse<T>(promise: Promise<PostgrestSingleResponse<T> | PostgrestResponse<T>>): Promise<SafeResponse<T>> {
  try {
    const response = await promise;
    if (response.error) {
      return {
        success: false,
        error: response.error,
        message: response.error.message
      };
    }
    return {
      success: true,
      data: response.data as T
    };
  } catch (error: any) {
    return {
      success: false,
      error,
      message: error.message || 'Unknown error occurred'
    };
  }
}

// Helper function to convert unknownObject to a Supabase param
// This helps with TypeScript type assertions
export function asSupabaseParam<T>(obj: T): T {
  return obj;
}

// Type guard for checking if a Supabase response is valid
export function isValidSupabaseData(data: any): boolean {
  return data !== null && 
         data !== undefined && 
         !('error' in data && data.error !== null);
}

// Helper function to check if a teacher invitation is valid
export function isValidInvitation(item: any): boolean {
  return item && 
         typeof item === 'object' && 
         'id' in item && 
         'email' in item &&
         'status' in item &&
         'created_at' in item &&
         'expires_at' in item;
}

// Helper function to check if a file item is valid
export function isValidFileItem(item: any): boolean {
  return item && 
         typeof item === 'object' && 
         'id' in item && 
         'filename' in item &&
         'file_type' in item &&
         'file_size' in item;
}

// Helper function to safely extract data from Supabase response
export function safelyExtractData<T>(data: any, defaultValue: T): T {
  if (isValidSupabaseData(data)) {
    return data as T;
  }
  return defaultValue;
}

// Safe casting for any type - used for type assertions where needed
export function safeAnyCast<T>(value: any): T {
  return value as T;
}
