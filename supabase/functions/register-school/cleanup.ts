
import { createSupabaseAdmin } from "./supabase-admin.ts";

export async function cleanupSchoolCodeOnFailure(supabaseAdmin: any, schoolCode: string) {
  try {
    await supabaseAdmin
      .from("school_codes")
      .delete()
      .eq("code", schoolCode);
    console.log("Cleaned up school_codes after failed school creation");
  } catch (cleanupError) {
    console.error("Error during cleanup of school_codes:", cleanupError);
  }
}

export async function cleanupOnFailure(supabaseAdmin: any, adminUserId?: string, schoolId?: string, schoolCode?: string) {
  try {
    if (adminUserId) {
      await supabaseAdmin.auth.admin.deleteUser(adminUserId);
      await supabaseAdmin.from("profiles").delete().eq("id", adminUserId);
    }
    
    if (schoolId) {
      await supabaseAdmin.from("schools").delete().eq("id", schoolId);
    }
    
    if (schoolCode) {
      await supabaseAdmin.from("school_codes").delete().eq("code", schoolCode);
    }
    
    console.log("Cleaned up after failed operation");
  } catch (cleanupError) {
    console.error("Error during cleanup:", cleanupError);
  }
}
