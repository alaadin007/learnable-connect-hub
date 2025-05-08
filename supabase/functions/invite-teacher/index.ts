
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

interface InviteTeacherRequest {
  email: string;
}

serve(async (req: Request) => {
  try {
    // Get request body
    const { email } = await req.json() as InviteTeacherRequest;
    
    if (!email) {
      throw new Error('Email is required');
    }
    
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
    
    // Check if user is a supervisor by calling the RPC function
    const { data: isSupervisor, error: supervisorError } = await supabaseClient.rpc(
      'is_user_supervisor',
      { user_id: user.id }
    );
    
    if (supervisorError || !isSupervisor) {
      throw new Error('Only school supervisors can invite teachers');
    }
    
    // Get the school for this supervisor
    const { data: teacherRecord, error: teacherError } = await supabaseClient
      .from('teachers')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    if (teacherError || !teacherRecord) {
      throw new Error('Could not find your school information');
    }
    
    // Get school name
    const { data: schoolData, error: schoolError } = await supabaseClient
      .from('schools')
      .select('name')
      .eq('id', teacherRecord.school_id)
      .single();
      
    if (schoolError) {
      throw new Error('Could not find school information');
    }
    
    // Invite the teacher by creating an invitation record
    const invitationToken = generateToken();
    
    const { data: invitation, error: inviteError } = await supabaseClient
      .from('teacher_invitations')
      .insert({
        school_id: teacherRecord.school_id,
        email: email,
        invitation_token: invitationToken,
        created_by: user.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      })
      .select()
      .single();
      
    if (inviteError) {
      throw new Error('Failed to create invitation: ' + inviteError.message);
    }
    
    // TODO: Send email to the invited teacher with the invitation link
    // This would typically be done with a separate service like SendGrid or AWS SES
    
    // Return the invitation data
    return new Response(
      JSON.stringify({
        success: true,
        invitation_id: invitation.id,
        school_id: teacherRecord.school_id,
        school_name: schoolData.name,
        email: email,
        invitation_link: `${supabaseUrl.replace('.supabase.co', '')}/invitation/${invitationToken}`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
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

// Helper function to generate a secure token
function generateToken(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const length = 20;
  
  // Generate a cryptographically secure random string
  const values = crypto.getRandomValues(new Uint8Array(length));
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(values[i] % characters.length);
  }
  
  return result;
}
