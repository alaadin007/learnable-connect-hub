
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

interface InviteStudentRequest {
  inviteType: 'code' | 'email';
  email?: string;
}

serve(async (req: Request) => {
  try {
    // Get request body
    const { inviteType, email } = await req.json() as InviteStudentRequest;
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Get auth user from request
    const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      throw new Error('Missing auth token');
    }
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }
    
    // Get the school for this user (either teacher or school admin)
    const { data: schoolId } = await supabaseClient.rpc('get_user_school_id');
    
    if (!schoolId) {
      throw new Error('Could not find your school information');
    }
    
    // Generate invitation code or send email invitation
    if (inviteType === 'code') {
      // Create student invitation with code
      const { data, error } = await supabaseClient.rpc(
        'create_student_invitation',
        { school_id_param: schoolId }
      );
      
      if (error) {
        throw new Error('Failed to create invitation: ' + error.message);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          code: data[0].code,
          invite_id: data[0].invite_id,
          expires_at: data[0].expires_at
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else if (inviteType === 'email' && email) {
      // Check if email already exists
      const { data: existingUser, error: existingUserError } = await supabaseClient.rpc(
        'check_if_email_exists',
        { input_email: email }
      );
      
      if (existingUserError) {
        throw new Error('Error checking email: ' + existingUserError.message);
      }
      
      if (existingUser) {
        throw new Error('A user with this email already exists');
      }
      
      // Create student invitation with code
      const { data, error } = await supabaseClient.rpc(
        'create_student_invitation',
        { school_id_param: schoolId }
      );
      
      if (error) {
        throw new Error('Failed to create invitation: ' + error.message);
      }
      
      // Save email with the invitation
      await supabaseClient
        .from('student_invites')
        .update({ email })
        .eq('id', data[0].invite_id);
      
      // TODO: Send email to the invited student with the invitation code
      // This would typically be done with a separate service like SendGrid or AWS SES
      
      return new Response(
        JSON.stringify({
          success: true,
          code: data[0].code,
          invite_id: data[0].invite_id,
          email: email,
          expires_at: data[0].expires_at
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      throw new Error('Invalid request parameters');
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
