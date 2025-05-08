
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ldlgckwkdsvrfuymidrr.supabase.co"
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbGdja3drZHN2cmZ1eW1pZHJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNTc2NzksImV4cCI6MjA2MTYzMzY3OX0.kItrTMcKThMXuwNDClYNTGkEq-1EVVldq1vFw7ZsKx0"

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Define test school code that will be used for test accounts
export const TEST_SCHOOL_CODE = "TEST0";

// Helper function to check if an account is a test account
export function isTestAccount(email: string): boolean {
  return email.includes(".test@learnable.edu") || email.startsWith("test-");
}
