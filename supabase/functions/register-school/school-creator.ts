
import { createSupabaseAdmin } from "./supabase-admin.ts";

export async function createSchoolRecord(supabaseAdmin: any, schoolName: string, schoolCode: string) {
  const { data: schoolData, error: schoolError } = await supabaseAdmin
    .from("schools")
    .insert({
      name: schoolName,
      code: schoolCode
    })
    .select()
    .single();
  
  if (schoolError || !schoolData) {
    console.error("Error creating school:", schoolError);
    throw new Error(`Failed to create school record: ${schoolError?.message}`);
  }
  
  const schoolId = schoolData.id;
  console.log(`School created with ID: ${schoolId}`);
  return schoolId;
}
