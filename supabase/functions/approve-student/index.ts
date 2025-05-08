
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

interface ApproveStudentRequest {
  studentId: string;
}

serve(async (req: Request) => {
  try {
    // Get request body
    const { studentId } = await req.json() as ApproveStudentRequest;
    
    if (!studentId) {
      throw new Error('Student ID is required');
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
    
    // Check if the requester is a teacher or school admin
    // First check if the requester is a teacher
    const { data: teacherData, error: teacherError } = await supabaseClient
      .from('teachers')
      .select('school_id')
      .eq('id', user.id)
      .single();
      
    if (teacherError) {
      throw new Error('Only teachers or school administrators can approve students');
    }
    
    // Get the student's school and make sure it matches the teacher's school
    const { data: studentData, error: studentError } = await supabaseClient
      .from('students')
      .select('school_id, status')
      .eq('id', studentId)
      .single();
      
    if (studentError || !studentData) {
      throw new Error('Student not found');
    }
    
    // Make sure the student belongs to the same school as the teacher
    if (studentData.school_id !== teacherData.school_id) {
      throw new Error('You can only approve students from your own school');
    }
    
    // Update the student status to active
    const { error: updateError } = await supabaseClient
      .from('students')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);
      
    if (updateError) {
      throw new Error('Failed to approve student: ' + updateError.message);
    }
    
    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Student approved successfully',
        student_id: studentId
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
