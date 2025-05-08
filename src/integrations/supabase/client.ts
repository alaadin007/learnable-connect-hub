
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../../src/integrations/supabase/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Define test school code that will be used for test accounts
export const TEST_SCHOOL_CODE = "TEST0";

// Helper function to check if an account is a test account
export function isTestAccount(email: string): boolean {
  return email.includes(".test@learnable.edu") || email.startsWith("test-");
}
