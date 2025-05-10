
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { isNetworkError, retryWithBackoff } from '@/utils/networkHelpers';

// Use hardcoded values as fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ldlgckwkdsvrfuymidrr.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbGdja3drZHN2cmZ1eW1pZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTc2NzksImV4cCI6MjA2MTYzMzY3OX0.kItrTMcKThMXuwNDClYNTGkEq-1EVVldq1vFw7ZsKx0"

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

// Add a connection check function that can be used throughout the app
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    // Try a simple query with retry mechanism
    const { error } = await retryWithBackoff(
      async () => await supabase.from('profiles').select('count', { count: 'exact', head: true }),
      3, // max retries
      1000 // initial delay in ms
    );
    
    if (error) {
      console.error("Database connection error:", error);
      
      // Don't show toast for unauthorized errors as these are handled by auth flow
      if (!error.message.includes('JWT expired') && !error.message.includes('not authorized')) {
        // Show a user-friendly error
        toast.error("Database Connection Issue", {
          description: "We're having trouble connecting to our services. Database connection is required."
        });
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to check database connection:", err);
    
    // Only show toast for network errors
    if (isNetworkError(err)) {
      toast.error("Network Error", {
        description: "Please check your internet connection. Database connectivity is required."
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
    // First check if this is a demo or test code
    if (DEMO_CODES.includes(code) || code.startsWith("DEMO-") || code === TEST_SCHOOL_CODE) {
      return { 
        valid: true, 
        schoolId: 'test-school-id', 
        schoolName: 'Test School' 
      };
    }
    
    // Try to verify the code using Supabase RPC function with retry mechanism
    const { data, error } = await retryWithBackoff(
      async () => await supabase.rpc('verify_and_link_school_code', { code }),
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
    
    // Store the school name in localStorage for future reference
    if (data[0].school_id) {
      try {
        localStorage.setItem(`school_name_${data[0].school_id}`, data[0].school_name || 'Unknown School');
      } catch (e) {
        console.error("Error storing school name:", e);
      }
    }
    
    return {
      valid: true,
      schoolId: data[0].school_id,
      schoolName: data[0].school_name
    };
  } catch (error) {
    console.error("Exception verifying school code:", error);
    return { valid: false };
  }
}

// API Key localStorage helpers
export const API_KEY_STORAGE = {
  OPENAI: 'openai_api_key',
  GEMINI: 'gemini_api_key',
  PROVIDER: 'ai_provider'
};

// Get API key from localStorage
export function getApiKey(provider: 'openai' | 'gemini'): string | null {
  return localStorage.getItem(
    provider === 'openai' ? API_KEY_STORAGE.OPENAI : API_KEY_STORAGE.GEMINI
  );
}

// Save API key to localStorage
export function saveApiKey(provider: 'openai' | 'gemini', key: string): void {
  localStorage.setItem(
    provider === 'openai' ? API_KEY_STORAGE.OPENAI : API_KEY_STORAGE.GEMINI, 
    key
  );
  localStorage.setItem(API_KEY_STORAGE.PROVIDER, provider);
}

// Get preferred AI provider
export function getAiProvider(): 'openai' | 'gemini' {
  return (localStorage.getItem(API_KEY_STORAGE.PROVIDER) as 'openai' | 'gemini') || 'openai';
}

// Check if API key is configured
export function isApiKeyConfigured(provider?: 'openai' | 'gemini'): boolean {
  const activeProvider = provider || getAiProvider();
  return !!getApiKey(activeProvider);
}
