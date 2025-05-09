
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

interface RequestBody {
  schoolId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRandomCode(length = 6): string {
  const prefix = 'SCH';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}${result}`;
}

function isValidCode(code: string): boolean {
  return /^SCH[A-Z0-9]{6}$/.test(code);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'You must be logged in to generate a school code' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      );
    }

    const { schoolId } = await req.json() as RequestBody;
    
    if (typeof schoolId !== 'string' || schoolId.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Invalid school ID format' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }
    
    // Check rate limit
    const { data: recentCodes } = await supabaseClient
      .from('school_code_logs')
      .select('generated_at')
      .eq('school_id', schoolId)
      .gte('generated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('generated_at', { ascending: false });

    if (recentCodes && recentCodes.length >= 5) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate Limit', 
          message: 'Too many code generations in 24 hours' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 429 
        }
      );
    }
    
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('user_type, school_id, is_supervisor')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      return new Response(
        JSON.stringify({ 
          error: 'Database Error', 
          message: 'Could not verify user permissions' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }
    
    if ((profile?.user_type !== 'school' && profile?.user_type !== 'school_admin') || 
        profile?.school_id !== schoolId ||
        !profile?.is_supervisor) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden', 
          message: 'You do not have permission to generate a code for this school' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 403 
        }
      );
    }
    
    let newCode = generateRandomCode();
    let codeExists = true;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (codeExists && attempts < maxAttempts) {
      const { data, error } = await supabaseClient
        .from('schools')
        .select('id')
        .eq('code', newCode);
        
      if (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Database Error', 
            message: 'Failed to check code uniqueness' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
            status: 500 
          }
        );
      }
      
      if (!data?.length) {
        codeExists = false;
      } else {
        newCode = generateRandomCode();
        attempts++;
      }
    }
    
    if (attempts >= maxAttempts || !isValidCode(newCode)) {
      return new Response(
        JSON.stringify({ 
          error: 'Generation Error', 
          message: 'Failed to generate a unique code' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }
    
    const { error: updateError } = await supabaseClient
      .from('schools')
      .update({ 
        code: newCode,
        code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', schoolId);
      
    if (updateError) {
      return new Response(
        JSON.stringify({ 
          error: 'Database Error', 
          message: 'Failed to update school code' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 500 
        }
      );
    }
    
    // Log the code generation
    await supabaseClient
      .from('school_code_logs')
      .insert({
        school_id: schoolId,
        generated_by: user.id,
        code: newCode,
        generated_at: new Date().toISOString()
      });
    
    return new Response(
      JSON.stringify({ code: newCode }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('Error in generate-school-code function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal Error', 
        message: 'An unexpected error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
