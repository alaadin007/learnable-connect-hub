import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { isNetworkError, retryWithBackoff } from '@/utils/networkHelpers';

// Use the actual Supabase project credentials
const supabaseUrl = 'https://ldlgckwkdsvrfuymidrr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbGdja3drZHN2cmZ1eW1pZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTc2NzksImV4cCI6MjA2MTYzMzY3OX0.kItrTMcKThMXuwNDClYNTGkEq-1EVVldq1vFw7ZsKx0';

// Add retry and error handling options
const clientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  },
  // Fix the schema type by using string literal
  db: {
    schema: "public" as const
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}

// Create a properly initialized Supabase client with explicit typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, clientOptions);

// Simplified connection check that doesn't rely on profiles table
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("Checking Supabase connection...");
    
    // Use a simpler query that doesn't depend on RLS policies
    const { error } = await supabase
      .from('schools')
      .select('count', { count: 'exact', head: true })
      .limit(0);
    
    if (error) {
      console.error("Database connection error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      // Only show user-friendly errors for specific cases
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.warn("Database schema may not be fully initialized");
        return false;
      }
      
      // Don't show toast for auth-related errors as these are handled by auth flow
      if (!error.message.includes('JWT expired') && 
          !error.message.includes('not authorized') &&
          !error.message.includes('permission denied')) {
        toast.error("Database Connection Issue", {
          description: "Having trouble connecting to the database. Please refresh the page."
        });
      }
      return false;
    }
    
    console.log("Database connection successful");
    return true;
  } catch (err) {
    console.error("Failed to check database connection:", err);
    
    // Only show toast for network errors
    if (isNetworkError(err)) {
      toast.error("Network Error", {
        description: "Please check your internet connection and try again."
      });
    }
    return false;
  }
};

// Define test school code that will be used for test accounts
export const TEST_SCHOOL_CODE = "SCHTEST0" 
export const DEMO_CODES = ["DEMO-CODE", "DEMO-AMP99S"]

// Helper function to check if an account is a test account
export function isTestAccount(email: string): boolean {
  return email?.includes(".test@learnable.edu") || email?.startsWith("test-");
}

// Helper function to verify a school code with improved error handling
export async function verifySchoolCode(code: string): Promise<{
  valid: boolean;
  schoolId?: string;
  schoolName?: string;
}> {
  try {
    // Security: Input validation for school code
    if (!code || typeof code !== 'string') {
      return { valid: false };
    }
    
    // Security: Sanitize input - only allow alphanumeric and common symbols
    const sanitizedCode = code.trim().replace(/[^A-Za-z0-9-_]/g, '');
    if (sanitizedCode !== code.trim()) {
      console.warn("School code contained invalid characters");
      return { valid: false };
    }
    
    // First check if this is a demo or test code
    if (DEMO_CODES.includes(sanitizedCode) || sanitizedCode.startsWith("DEMO-") || sanitizedCode === TEST_SCHOOL_CODE) {
      return { 
        valid: true, 
        schoolId: 'test-school-id', 
        schoolName: 'Test School' 
      };
    }
    
    // Try to verify the code using Supabase RPC function with retry mechanism
    const { data, error } = await retryWithBackoff(
      async () => await supabase.rpc('verify_and_link_school_code', { code: sanitizedCode }),
      2,  // max retries
      500  // initial delay in ms
    );
    
    if (error) {
      console.error("Error verifying school code:", error);
      return { valid: false };
    }
    
    // Verify data exists and is an array
    if (!data || !Array.isArray(data) || data.length === 0 || !data[0]?.valid) {
      return { valid: false };
    }
    
    // Security: Validate the returned school data
    const schoolData = data[0];
    if (schoolData.school_id && typeof schoolData.school_id === 'string') {
      try {
        // Security: Store school name securely
        const schoolName = schoolData.school_name || 'Unknown School';
        localStorage.setItem(`school_name_${schoolData.school_id}`, schoolName);
      } catch (e) {
        console.error("Error storing school name:", e);
      }
    }
    
    return {
      valid: true,
      schoolId: schoolData.school_id,
      schoolName: schoolData.school_name
    };
  } catch (error) {
    console.error("Exception verifying school code:", error);
    return { valid: false };
  }
}

// API Key localStorage helpers with security improvements
export const API_KEY_STORAGE = {
  OPENAI: 'openai_api_key',
  GEMINI: 'gemini_api_key',
  PROVIDER: 'ai_provider'
} as const;

// Get API key from localStorage with validation
export function getApiKey(provider: 'openai' | 'gemini'): string | null {
  try {
    const key = localStorage.getItem(
      provider === 'openai' ? API_KEY_STORAGE.OPENAI : API_KEY_STORAGE.GEMINI
    );
    
    // Security: Basic validation of API key format
    if (key && typeof key === 'string' && key.length > 10) {
      return key;
    }
    return null;
  } catch (e) {
    console.error("Error retrieving API key:", e);
    return null;
  }
}

// Save API key to localStorage with validation
export function saveApiKey(provider: 'openai' | 'gemini', key: string): void {
  try {
    // Security: Input validation
    if (!key || typeof key !== 'string' || key.length < 10) {
      throw new Error('Invalid API key format');
    }
    
    // Security: Validate key format based on provider
    if (provider === 'openai' && !key.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format');
    }
    
    localStorage.setItem(
      provider === 'openai' ? API_KEY_STORAGE.OPENAI : API_KEY_STORAGE.GEMINI, 
      key
    );
    localStorage.setItem(API_KEY_STORAGE.PROVIDER, provider);
  } catch (e) {
    console.error("Error saving API key:", e);
    throw e;
  }
}

// Get preferred AI provider
export function getAiProvider(): 'openai' | 'gemini' {
  try {
    const provider = localStorage.getItem(API_KEY_STORAGE.PROVIDER);
    return (provider === 'gemini' ? 'gemini' : 'openai');
  } catch (e) {
    console.error("Error getting AI provider:", e);
    return 'openai';
  }
}

// Check if API key is configured
export function isApiKeyConfigured(provider?: 'openai' | 'gemini'): boolean {
  const activeProvider = provider || getAiProvider();
  return !!getApiKey(activeProvider);
}
