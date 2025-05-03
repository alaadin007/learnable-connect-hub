
import { createSupabaseAdmin } from "./supabase-admin.ts";

export async function generateSchoolCode(supabaseAdmin: any) {
  const { data: schoolCodeData, error: schoolCodeError } = await supabaseAdmin.rpc(
    "generate_school_code"
  );
  
  if (schoolCodeError) {
    console.error("Error generating school code:", schoolCodeError);
    throw new Error(`Failed to generate school code: ${schoolCodeError.message}`);
  }
  
  console.log(`Generated school code: ${schoolCodeData}`);
  return schoolCodeData;
}

export async function createSchoolCodeEntry(supabaseAdmin: any, schoolCode: string, schoolName: string) {
  const { error: schoolCodeInsertError } = await supabaseAdmin
    .from("school_codes")
    .insert({
      code: schoolCode,
      school_name: schoolName,
      active: true
    });
  
  if (schoolCodeInsertError) {
    console.error("Error inserting school code:", schoolCodeInsertError);
    throw new Error(`Failed to register school code: ${schoolCodeInsertError.message}`);
  }
}
