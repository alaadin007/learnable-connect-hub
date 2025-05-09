
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

interface RequestBody {
  schoolId: string;
}

interface RequestQueryParams {
  schoolId?: string;
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

function parseQueryParams(url: string): RequestQueryParams {
  try {
    const params = new URL(url).searchParams;
    const result: RequestQueryParams = {};
    
    if (params.has('schoolId')) {
      result.schoolId = params.get('schoolId') || undefined;
    }
    
    return result;
  } catch (error) {
    console.error("Error parsing query parameters:", error);
    return {};
  }
}

function logRequestDetails(req: Request, extraInfo: Record<string, any> = {}): void {
  console.log("Request details:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries([...req.headers]),
    hasBody: req.body !== null,
    timestamp: new Date().toISOString(),
    clientInfo: req.headers.get('x-client-info') || 'Not provided',
    origin: req.headers.get('origin') || 'Not provided',
    ...extraInfo
  });
}

serve(async (req) => {
  // Log detailed request information
  logRequestDetails(req);

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
      console.error("Authentication error:", userError);
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

    // Try to get schoolId from body first, then from query parameters
    let schoolId: string;
    
    // Parse JSON body if available
    if (req.body) {
      try {
        const { schoolId: bodySchoolId } = await req.json() as RequestBody;
        schoolId = bodySchoolId;
      } catch (e) {
        console.error("Error parsing request body:", e);
        // If body parsing fails, try query parameters
        const queryParams = parseQueryParams(req.url);
        schoolId = queryParams.schoolId || '';
      }
    } else {
      // No body, use query parameters
      const queryParams = parseQueryParams(req.url);
      schoolId = queryParams.schoolId || '';
    }
    
    if (typeof schoolId !== 'string' || schoolId.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: 'Invalid or missing school ID' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 400 
        }
      );
    }
    
    console.log("Processing request for school ID:", schoolId);
    
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
      console.error("Profile error:", profileError);
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
      console.warn("Permission denied:", {
        userType: profile?.user_type,
        userSchoolId: profile?.school_id,
        requestedSchoolId: schoolId,
        isSupervisor: profile?.is_supervisor
      });
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
        console.error("Code uniqueness check error:", error);
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
    
    // Generate expiration date (24 hours from now)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    const { error: updateError } = await supabaseClient
      .from('schools')
      .update({ 
        code: newCode,
        code_expires_at: expiresAt
      })
      .eq('id', schoolId);
      
    if (updateError) {
      console.error("School update error:", updateError);
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
    
    console.log("Successfully generated new school code:", newCode);
    
    return new Response(
      JSON.stringify({ 
        code: newCode,
        expires_at: expiresAt 
      }),
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
