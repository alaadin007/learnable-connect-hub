
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/db"; // (optional) import your DB types if you have

export async function createAdminUser(
  supabaseAdmin: SupabaseClient<any>, 
  adminEmail: string, 
  adminPassword: string, 
  adminFullName: string,
  schoolCode: string,
  schoolName: string,
  redirectURL: string
): Promise<string> {
  console.log(`Creating admin user for email: ${adminEmail}, school: ${schoolName}, redirecting to: ${redirectURL}`);
  
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: false, // Require email confirmation
    user_metadata: {
      full_name: adminFullName,
      user_type: "school",
      school_code: schoolCode,
      school_name: schoolName,
    },
    email_confirm_redirect_url: redirectURL,
  });

  if (userError) {
    console.error("Error creating admin user:", userError);

    if (userError.message?.includes("already registered")) {
      throw new Error("Email already registered");
    }

    throw new Error(`Failed to create admin user account: ${userError.message}`);
  }

  if (!userData?.user?.id) {
    console.error("No user data returned when creating admin");
    throw new Error("Failed to create admin user - no user data returned");
  }

  console.log(`Admin user created with ID: ${userData.user.id}`);
  return userData.user.id;
}

export async function createProfileRecord(
  supabaseAdmin: SupabaseClient<any>,
  adminUserId: string,
  adminFullName: string,
  schoolCode: string,
  schoolName: string
): Promise<void> {
  console.log(`Creating profile record for user ID: ${adminUserId}`);
  
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: adminUserId,
      user_type: "school",
      full_name: adminFullName,
      school_code: schoolCode,
      school_name: schoolName,
    });

  if (profileError) {
    console.error("Error creating profile:", profileError);
    // As documented, can continue because DB trigger handles it
  }
}

export async function createTeacherRecord(
  supabaseAdmin: SupabaseClient<any>,
  adminUserId: string,
  schoolId: string
): Promise<void> {
  console.log(`Creating teacher record for user ID: ${adminUserId}, school ID: ${schoolId}`);
  
  const { error: teacherError } = await supabaseAdmin
    .from("teachers")
    .insert({
      id: adminUserId,
      school_id: schoolId,
      is_supervisor: true,
    });

  if (teacherError) {
    console.error("Error creating teacher record:", teacherError);
    throw new Error(`Failed to create teacher admin record: ${teacherError.message}`);
  }
}
