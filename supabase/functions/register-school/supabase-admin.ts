import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Create a Supabase client with the service role key (for admin operations)
export function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}