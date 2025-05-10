
// Import the necessary utilities
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/contexts/AuthContext";
import { fetchWithReliability, retryWithBackoff, executeWithTimeout } from "./networkHelpers";

// Function to get user school ID in a safe way with fallback
export async function getUserSchoolId(): Promise<string | null> {
  try {
    // First try to get from localStorage for instant loading
    const storedSchoolId = localStorage.getItem('schoolId');
    if (storedSchoolId) {
      return storedSchoolId;
    }
    
    // As a last resort, try to get from the session but with error handling
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        return null;
      }
      
      // Try to get from user metadata
      if (data.session.user.user_metadata?.school_id) {
        // Store in localStorage for future use
        const schoolId = data.session.user.user_metadata.school_id;
        localStorage.setItem('schoolId', schoolId);
        return schoolId;
      }

      // Try to get from a dedicated function with timeout
      const { data: schoolIdResult } = await executeWithTimeout(async () => {
        const response = await supabase.rpc('get_user_school_id_safe', {
          user_id_param: data.session.user.id
        });
        return response;
      }, 5000);
      
      if (schoolIdResult) {
        localStorage.setItem('schoolId', schoolIdResult);
        return schoolIdResult;
      }
      
      // Return null if we couldn't get the school ID
      return null;
    } catch (error) {
      console.error("Error getting user session:", error);
      return null;
    }
  } catch (error) {
    console.error("Error getting user school ID:", error);
    return null;
  }
}

// Function to get current user role with fallback
export async function getUserRole(): Promise<UserRole | null> {
  try {
    // First try to get from localStorage for instant loading
    const storedRole = localStorage.getItem('userRole') as UserRole;
    if (storedRole) {
      return storedRole;
    }
    
    // Try to get from the session
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      return null;
    }
    
    if (data.session.user.user_metadata?.user_type) {
      const role = data.session.user.user_metadata.user_type as UserRole;
      // Store in localStorage for future use
      localStorage.setItem('userRole', role);
      return role;
    }
    
    // Try to get from a dedicated function with timeout
    const { data: userRoleResult } = await executeWithTimeout(async () => {
      const response = await supabase.rpc('get_user_role_safe', {
        user_id_param: data.session.user.id
      });
      return response;
    }, 5000);
    
    if (userRoleResult) {
      localStorage.setItem('userRole', userRoleResult);
      return userRoleResult as UserRole;
    }
    
    // Return null if we couldn't determine the role
    return null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

// Check if a user is a school admin
export function isSchoolAdmin(role: UserRole | null): boolean {
  return role === 'school' || role === 'school_admin';
}

// These functions always return values to prevent errors
export function getUserRoleWithFallback(): UserRole {
  // First check localStorage which is most reliable
  const role = localStorage.getItem('userRole') as UserRole;
  if (role) return role;
  
  // Check for test account flags in sessionStorage
  const testAccount = sessionStorage.getItem('testAccountType');
  if (testAccount) {
    if (testAccount === 'student') return 'student';
    if (testAccount === 'teacher') return 'teacher';
    if (testAccount === 'school') return 'school';
  }
  
  // Try to get it from the session data if available
  try {
    const userMeta = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    if (userMeta?.currentSession?.user?.user_metadata?.user_type) {
      const extractedRole = userMeta.currentSession.user.user_metadata.user_type;
      // Store for future use
      localStorage.setItem('userRole', extractedRole);
      return extractedRole;
    }
  } catch (e) {
    console.error("Error parsing local session:", e);
  }
  
  return 'student'; // Default to student if no role found
}

export function getSchoolIdWithFallback(): string {
  const schoolId = localStorage.getItem('schoolId');
  if (schoolId) return schoolId;
  
  // Try to get it from the session data if available
  try {
    const userMeta = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
    if (userMeta?.currentSession?.user?.user_metadata?.school_id) {
      const extractedSchoolId = userMeta.currentSession.user.user_metadata.school_id;
      // Store for future use
      localStorage.setItem('schoolId', extractedSchoolId);
      return extractedSchoolId;
    }
  } catch (e) {
    console.error("Error parsing local session:", e);
  }
  
  return '';
}

// Optimized function to fetch assessments for students
export async function fetchStudentAssessments(schoolId: string, studentId: string) {
  try {
    const cacheKey = `assessments_${schoolId}_${studentId}`;
    
    // Get client from supabase directly - this ensures proper authentication
    // This is the key fix - using the Supabase client directly instead of fetch
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        id, 
        title, 
        description, 
        due_date, 
        created_at,
        teacher_id,
        teacher:teachers(
          id, 
          profiles(full_name)
        ),
        submission:assessment_submissions(
          id, 
          score, 
          completed,
          submitted_at
        )
      `)
      .eq('school_id', schoolId)
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error("Error fetching student assessments:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching student assessments:", error);
    throw error;
  }
}

// Function to persist user role and school ID to database
export async function persistUserRoleToDatabase(userId: string, role: UserRole, schoolId?: string): Promise<boolean> {
  try {
    console.log(`Persisting user role to database: ${role} for user ${userId}`);
    
    // First update the profiles table
    const { error: profileError } = await retryWithBackoff(async () => {
      return await supabase
        .from('profiles')
        .upsert({
          id: userId,
          user_type: role,
          school_id: schoolId || null
        }, { onConflict: 'id' });
    });
    
    if (profileError) {
      console.error("Error updating profile:", profileError);
      return false;
    }
    
    // Then update the specific role table (students, teachers, or school_admins)
    if (role === 'student') {
      const { error: studentError } = await retryWithBackoff(async () => {
        return await supabase
          .from('students')
          .upsert({
            id: userId,
            school_id: schoolId || null,
            status: 'pending' // New students start as pending
          }, { onConflict: 'id' });
      });
      
      if (studentError) {
        console.error("Error creating student record:", studentError);
        return false;
      }
    } else if (role === 'teacher') {
      const { error: teacherError } = await retryWithBackoff(async () => {
        return await supabase
          .from('teachers')
          .upsert({
            id: userId,
            school_id: schoolId || null,
            is_supervisor: false // Default to non-supervisor
          }, { onConflict: 'id' });
      });
      
      if (teacherError) {
        console.error("Error creating teacher record:", teacherError);
        return false;
      }
    } else if (isSchoolAdmin(role)) {
      const { error: adminError } = await retryWithBackoff(async () => {
        return await supabase
          .from('school_admins')
          .upsert({
            id: userId,
            school_id: schoolId || null
          }, { onConflict: 'id' });
      });
      
      if (adminError) {
        console.error("Error creating school admin record:", adminError);
        return false;
      }
    }
    
    // Store in localStorage for immediate use
    localStorage.setItem('userRole', role);
    if (schoolId) localStorage.setItem('schoolId', schoolId);
    
    return true;
  } catch (error) {
    console.error("Error persisting user role:", error);
    return false;
  }
}
