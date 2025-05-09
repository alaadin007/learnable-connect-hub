
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

interface RequestBody {
  schoolId: string;
}

function generateRandomCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'You must be logged in to generate a school code' }),
        { headers: { 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get the request body
    const { schoolId } = await req.json() as RequestBody;
    
    if (!schoolId) {
      return new Response(
        JSON.stringify({ error: 'Bad Request', message: 'School ID is required' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check if the user is authorized to manage this school
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_type, school_id')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'Database Error', message: 'Could not verify user permissions' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Check if user is a school admin or if this is their school
    if ((profile?.user_type !== 'school' && profile?.user_type !== 'school_admin') || 
        profile?.school_id !== schoolId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden', message: 'You do not have permission to generate a code for this school' }),
        { headers: { 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    // Generate a new code
    let newCode = generateRandomCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 5;
    
    // Make sure the code is unique
    while (codeExists && attempts < maxAttempts) {
      const { data, error } = await supabaseClient
        .from('schools')
        .select('id')
        .eq('code', newCode);
        
      if (!data?.length) {
        codeExists = false;
      } else {
        newCode = generateRandomCode();
        attempts++;
      }
    }
    
    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: 'Generation Error', message: 'Failed to generate a unique code' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Update the school with the new code
    const { error: updateError } = await supabaseClient
      .from('schools')
      .update({ code: newCode })
      .eq('id', schoolId);
      
    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Database Error', message: 'Failed to update school code' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Return the new code
    return new Response(
      JSON.stringify({ code: newCode }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error('Error in generate-school-code function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal Error', message: 'An unexpected error occurred' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
