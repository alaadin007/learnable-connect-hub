
import { SchoolRegistrationData, RegistrationResult } from "./types.ts";
import { corsHeaders } from "./cors.ts";
import { checkEmailExists } from "./email-verification.ts";
import { createSupabaseAdmin } from "./supabase-admin.ts";
import { generateSchoolCode, createSchoolCodeEntry } from "./school-code-manager.ts";
import { createSchoolRecord } from "./school-creator.ts";
import { createAdminUser, createProfileRecord, createTeacherRecord } from "./user-creator.ts";
import { cleanupSchoolCodeOnFailure, cleanupOnFailure } from "./cleanup.ts";

export async function handleSchoolRegistration(req: Request): Promise<Response> {
  // Get request data
  let requestData;
  try {
    requestData = await req.json();
    console.log("Request data received:", JSON.stringify({
      schoolName: requestData.schoolName,
      adminEmail: requestData.adminEmail,
      adminFullName: requestData.adminFullName,
      // Not logging password for security
    }));
  } catch (parseError) {
    console.error("Failed to parse request JSON:", parseError);
    return new Response(
      JSON.stringify({ error: "Invalid request format" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  const { schoolName, adminEmail, adminPassword, adminFullName } = requestData as SchoolRegistrationData;
  
  // Get request URL to determine origin for redirects
  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  console.log(`Request origin: ${origin}`);
  
  // Retrieve frontend URL - use environment variable if set, otherwise use the request origin
  const frontendURL = Deno.env.get("FRONTEND_URL") || origin;
  console.log(`Frontend URL being used: ${frontendURL}`);
  console.log(`Redirect URL will be: ${frontendURL}/login?email_confirmed=true`);
  
  // Validate required fields
  if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
    console.error("Missing required fields:", {
      hasSchoolName: !!schoolName,
      hasAdminEmail: !!adminEmail,
      hasAdminPassword: !!adminPassword,
      hasAdminFullName: !!adminFullName
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Missing required fields. School name, admin email, admin password, and admin full name are required." 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  // Create a Supabase client with the service role key
  const supabaseAdmin = createSupabaseAdmin();
  
  // Check if email already exists FIRST before creating any resources
  const emailCheck = await checkEmailExists(adminEmail);
  if (emailCheck.exists && emailCheck.response) {
    return emailCheck.response;
  }
  
  try {
    // Generate a school code
    const schoolCode = await generateSchoolCode(supabaseAdmin);
    
    // First create the entry in school_codes table
    await createSchoolCodeEntry(supabaseAdmin, schoolCode, schoolName);
    
    let schoolId;
    try {
      // Create the school record
      schoolId = await createSchoolRecord(supabaseAdmin, schoolName, schoolCode);
    } catch (error) {
      // Clean up the school_code entry
      await cleanupSchoolCodeOnFailure(supabaseAdmin, schoolCode);
      throw error;
    }
    
    // Set up redirect URL for email confirmation
    const redirectURL = `${frontendURL}/login?email_confirmed=true`;
    console.log(`Email confirmation redirect URL: ${redirectURL}`);
    
    let adminUserId;
    try {
      // Create the admin user
      adminUserId = await createAdminUser(
        supabaseAdmin, 
        adminEmail, 
        adminPassword, 
        adminFullName, 
        schoolCode, 
        schoolName, 
        redirectURL
      );
    } catch (error: any) {
      // Clean up: remove school if user creation fails
      await cleanupOnFailure(supabaseAdmin, undefined, schoolId, schoolCode);
      
      // Special handling for "already registered" errors
      if (error.message.includes("already registered")) {
        return new Response(
          JSON.stringify({ 
            error: "Email already registered", 
            message: "This email address is already registered. Please use a different email address or try logging in." 
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      throw error;
    }
    
    try {
      // Create profile record
      await createProfileRecord(supabaseAdmin, adminUserId, adminFullName, schoolCode, schoolName);
      
      // Create teacher record with supervisor privileges
      await createTeacherRecord(supabaseAdmin, adminUserId, schoolId);
    } catch (error) {
      // Clean up: remove user if teacher record creation fails
      await cleanupOnFailure(supabaseAdmin, adminUserId, schoolId, schoolCode);
      throw error;
    }

    // Return success with school and admin info
    const result: RegistrationResult = {
      success: true,
      schoolId,
      schoolCode,
      adminUserId,
      emailSent: true, // We're sending confirmation emails
      emailError: null,
      message: "School and admin account successfully created. Please check your email to verify your account before logging in."
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error during registration:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "An unexpected error occurred", 
        details: error.stack || "No stack trace available"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}
