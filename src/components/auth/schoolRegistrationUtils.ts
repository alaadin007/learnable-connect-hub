
import { supabase } from "@/integrations/supabase/client";

/**
 * Check if an email is associated with a particular user role
 * @param email The email to check
 * @returns The user role if found, null otherwise
 */
export async function checkEmailExistingRole(email: string): Promise<string | null> {
  try {
    // Use our new RPC function that handles the lookup server-side
    const { data, error } = await supabase.rpc('get_user_role_by_email', { 
      input_email: email 
    });

    if (error) {
      console.error('Error checking email role:', error);
      
      // Fallback: try to get the profile directly if the RPC fails
      try {
        // Use the auth admin API to get users - no filters in this version of the API
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        
        // Filter users manually - make sure to check for undefined users field
        if (userData && userData.users && Array.isArray(userData.users)) {
          // Define a proper type for users array elements
          interface SupabaseUser {
            id: string;
            email?: string;
            user_metadata?: Record<string, any>;
          }
          
          // Safely cast the users array to our defined type
          const users = userData.users as SupabaseUser[];
          
          const matchingUser = users.find(user => {
            return user && 
                  typeof user === 'object' && 
                  'email' in user && 
                  typeof user.email === 'string' && 
                  user.email === email;
          });
          
          if (!userError && matchingUser && matchingUser.id) {
            // Check user metadata first
            if (matchingUser.user_metadata && 
                typeof matchingUser.user_metadata === 'object' &&
                'user_type' in matchingUser.user_metadata) {
              const roleValue = matchingUser.user_metadata.user_type as string;
              return formatRoleForDisplay(roleValue);
            }
            
            // If not in metadata, check the profiles table
            const { data: profileData } = await supabase
              .from('profiles')
              .select('user_type')
              .eq('id', matchingUser.id)
              .single();
              
            if (profileData && typeof profileData === 'object' && 'user_type' in profileData) {
              return formatRoleForDisplay(profileData.user_type as string);
            }
            
            // Last resort, check the user_roles table
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', matchingUser.id)
              .single();
              
            if (roleData && typeof roleData === 'object' && 'role' in roleData) {
              return formatRoleForDisplay(roleData.role as string);
            }
          }
        }
      } catch (fallbackError) {
        console.error('Fallback email role check failed:', fallbackError);
      }
      
      return null;
    }

    // Format the role for display if needed
    return formatRoleForDisplay(data as string);
  } catch (e) {
    console.error('Exception checking email role:', e);
    return null;
  }
}

/**
 * Format a role value for display
 * @param role The raw role value
 * @returns Formatted role for display
 */
function formatRoleForDisplay(role: string | null): string | null {
  if (!role) return null;
  
  // Map all legacy role names to our simplified set
  if (role === "school_admin") return "School Administrator";
  
  switch (role) {
    case "school":
      return "School Administrator";
    case "teacher":
    case "teacher_supervisor":
      return "Teacher";
    case "student":
      return "Student";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

/**
 * Check if an email already exists in the system
 * @param email The email to check
 * @returns Boolean indicating if the email exists
 */
export async function checkIfEmailExists(email: string): Promise<boolean> {
  try {
    // Use rpc function that's available in the database
    const { data, error } = await supabase.rpc('check_if_email_exists', {
      input_email: email  // Parameter name matches the function parameter in database
    });

    if (error) {
      console.error('Error checking if email exists:', error);
      return false;
    }

    // Explicitly cast the result to boolean to ensure type safety
    return Boolean(data);
  } catch (e) {
    console.error('Exception checking if email exists:', e);
    return false;
  }
}
