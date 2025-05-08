import { supabase } from '@/integrations/supabase/client';

export async function fetchSchoolCodes() {
  const { data, error } = await supabase.from('schools').select('code');
  if (error) {
    console.error('Error fetching school codes:', error);
    return [];
  }
  return data.map(item => item.code);
}

export async function fetchSchoolData(code: string) {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.error('Error fetching school data:', error);
    return null;
  }
  return data;
}

// Get invitations for a specific school
export async function getTeacherInvitationsForSchool(schoolId: string) {
  try {
    // Use the teacher_invitations table instead
    const { data, error } = await supabase
      .from('teacher_invitations')
      .select('*')
      .eq('school_id', schoolId);
      
    if (error) {
      console.error('Error fetching teacher invitations:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getTeacherInvitationsForSchool:', error);
    return [];
  }
}

// Generate a student invitation code
export async function generateStudentInvitationCode(schoolId: string) {
  try {
    const { data, error } = await supabase.rpc('generate_student_invitation_code', {
      school_id_param: schoolId,
    });
    
    if (error) {
      console.error('Error generating student invitation code:', error);
      return null;
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('No invitation code returned');
      return null;
    }
    
    return data[0] ? data[0].invite_id : null;
  } catch (error) {
    console.error('Error in generateStudentInvitationCode:', error);
    return null;
  }
}

// Get student invitation codes for a school
export async function getStudentInvitationCodes(schoolId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_active_student_invitation_codes', {
        school_id_param: schoolId,
      });
    
    if (error) {
      console.error('Error fetching student invitation codes:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getStudentInvitationCodes:', error);
    return [];
  }
}
