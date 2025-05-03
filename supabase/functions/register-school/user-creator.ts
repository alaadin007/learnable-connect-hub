
import { createSupabaseAdmin } from "./supabase-admin.ts";

export async function createAdminUser(
  supabaseAdmin: any, 
  adminEmail: string, 
  adminPassword: string, 
  adminFullName: string,
  schoolCode: string,
  schoolName: string,
  redirectURL: string
) {
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: false, // Require email confirmation
    user_metadata: {
      full_name: adminFullName,
      user_type: "school", // Designate as school admin
      school_code: schoolCode,
      school_name: schoolName
    },
    // Add redirect URLs to ensure confirmation redirects to the right place
    email_confirm_redirect_url: redirectURL
  });
  
  if (userError) {
    console.error("Error creating admin user:", userError);
    
    // Special handling for "already registered" errors
    if (userError.message.includes("already registered")) {
      throw new Error("Email already registered");
    }
      
    throw new Error(`Failed to create admin user account: ${userError.message}`);
  }
  
  if (!userData || !userData.user) {
    console.error("No user data returned when creating admin");
    throw new Error("Failed to create admin user - no user data returned");
  }
  
  const adminUserId = userData.user.id;
  console.log(`Admin user created with ID: ${adminUserId}`);
  return adminUserId;
}

export async function createProfileRecord(
  supabaseAdmin: any,
  adminUserId: string,
  adminFullName: string,
  schoolCode: string,
  schoolName: string
) {
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: adminUserId,
      user_type: "school",
      full_name: adminFullName,
      school_code: schoolCode,
      school_name: schoolName
    });
  
  if (profileError) {
    console.error("Error creating profile:", profileError);
    // Continue despite profile error, as the handle_new_user trigger should handle this
  }
}

export async function createTeacherRecord(supabaseAdmin: any, adminUserId: string, schoolId: string) {
  const { error: teacherError } = await supabaseAdmin
    .from("teachers")
    .insert({
      id: adminUserId,
      school_id: schoolId,
      is_supervisor: true
    });
  
  if (teacherError) {
    console.error("Error creating teacher record:", teacherError);
    throw new Error(`Failed to create teacher admin record: ${teacherError.message}`);
  }
}
