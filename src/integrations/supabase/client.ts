
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types';

// Use hardcoded values as fallbacks for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://ldlgckwkdsvrfuymidrr.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbGdja3drZHN2cmZ1eW1pZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTc2NzksImV4cCI6MjA2MTYzMzY3OX0.kItrTMcKThMXuwNDClYNTGkEq-1EVVldq1vFw7ZsKx0"

// Create a properly initialized Supabase client with explicit typing
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey
    }
  }
})

// Define test school code that will be used for test accounts
export const TEST_SCHOOL_CODE = "SCHTEST0" 

// Helper function to check if an account is a test account
export function isTestAccount(email: string): boolean {
  return email.includes(".test@learnable.edu") || email.startsWith("test-");
}

// Helper function to verify a school code
export async function verifySchoolCode(code: string): Promise<{
  valid: boolean;
  schoolId?: string;
  schoolName?: string;
}> {
  try {
    const { data, error } = await supabase
      .rpc('verify_and_link_school_code', { code });
    
    if (error) {
      console.error("Error verifying school code:", error);
      return { valid: false };
    }
    
    if (!data || data.length === 0 || !data[0].valid) {
      return { valid: false };
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
