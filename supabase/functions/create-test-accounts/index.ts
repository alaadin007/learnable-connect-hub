
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

interface CreateTestAccountsRequest {
  schoolEmail?: string;
  teacherEmail?: string;
  studentEmail?: string;
}

serve(async (req: Request) => {
  try {
    // Get request body
    const { schoolEmail = 'school.test@learnable.edu', 
            teacherEmail = 'teacher.test@learnable.edu', 
            studentEmail = 'student.test@learnable.edu' } = await req.json() as CreateTestAccountsRequest;
            
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate a test school code
    const schoolCode = 'TEST' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    // Create school account
    const { data: schoolData, error: schoolError } = await supabase.auth.admin.createUser({
      email: schoolEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test School Admin',
        user_type: 'school',
        school_code: schoolCode
      }
    });
    
    if (schoolError) throw schoolError;
    
    // Create school record
    const { data: schoolRecord, error: schoolRecordError } = await supabase
      .from('schools')
      .insert({
        name: 'Test School',
        code: schoolCode,
        contact_email: schoolEmail
      })
      .select()
      .single();
      
    if (schoolRecordError) throw schoolRecordError;
    
    // Update profile and create teacher record for school admin
    await supabase.from('profiles').upsert({
      id: schoolData.user.id,
      full_name: 'Test School Admin',
      user_type: 'school',
      school_id: schoolRecord.id
    });
    
    await supabase.from('teachers').insert({
      id: schoolData.user.id,
      school_id: schoolRecord.id,
      is_supervisor: true
    });
    
    // Create teacher account
    const { data: teacherData, error: teacherError } = await supabase.auth.admin.createUser({
      email: teacherEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Teacher',
        user_type: 'teacher',
        school_code: schoolCode
      }
    });
    
    if (teacherError) throw teacherError;
    
    // Update profile and create teacher record
    await supabase.from('profiles').upsert({
      id: teacherData.user.id,
      full_name: 'Test Teacher',
      user_type: 'teacher',
      school_id: schoolRecord.id
    });
    
    await supabase.from('teachers').insert({
      id: teacherData.user.id,
      school_id: schoolRecord.id,
      is_supervisor: false
    });
    
    // Create student account
    const { data: studentData, error: studentError } = await supabase.auth.admin.createUser({
      email: studentEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Student',
        user_type: 'student',
        school_code: schoolCode
      }
    });
    
    if (studentError) throw studentError;
    
    // Update profile and create student record
    await supabase.from('profiles').upsert({
      id: studentData.user.id,
      full_name: 'Test Student',
      user_type: 'student',
      school_id: schoolRecord.id
    });
    
    await supabase.from('students').insert({
      id: studentData.user.id,
      school_id: schoolRecord.id,
      status: 'active'
    });
    
    // Populate test data
    await supabase.rpc('populatetestaccountwithsessions', {
      userid: studentData.user.id,
      schoolid: schoolRecord.id,
      num_sessions: 10
    });

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        school: {
          email: schoolEmail,
          id: schoolData.user.id,
          school_id: schoolRecord.id,
          school_code: schoolCode
        },
        teacher: {
          email: teacherEmail,
          id: teacherData.user.id
        },
        student: {
          email: studentEmail,
          id: studentData.user.id
        }
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
})
