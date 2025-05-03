
import { SchoolRegistrationData, RegistrationResult } from "./types.ts";
import { corsHeaders } from "./cors.ts";
import { checkEmailExists } from "./email-verification.ts";
import { createSupabaseAdmin } from "./supabase-admin.ts";
import { generateSchoolCode, createSchoolCodeEntry } from "./school-code-manager.ts";
import { createSchoolRecord } from "./school-creator.ts";
import { createAdminUser, createProfileRecord, createTeacherRecord } from "./user-creator.ts";
import { cleanupSchoolCodeOnFailure, cleanupOnFailure } from "./cleanup.ts";

export async function handleSchoolRegistration(req: Request): Promise<Response> {
  console.log("School registration request received");
  let requestData: SchoolRegistrationData;

  try {
    requestData = await req.json();
    // Only log safe info (avoid password)
    console.log(
      "Received registration data:",
      JSON.stringify({
        schoolName: requestData.schoolName,
        adminEmail: requestData.adminEmail,
        adminFullName: requestData.adminFullName,
      }),
    );
  } catch (parseError) {
    console.error("Failed to parse JSON body:", parseError);
    return new Response(
      JSON.stringify({ error: "Invalid JSON body." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { schoolName, adminEmail, adminPassword, adminFullName } = requestData;

  if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
    console.error("Missing required fields in registration data");
    return new Response(
      JSON.stringify({
        error: "Missing required fields: schoolName, adminEmail, adminPassword, adminFullName",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const requestUrl = new URL(req.url);
  const origin = requestUrl.origin;
  const frontendURL = Deno.env.get("FRONTEND_URL") || origin;
  const emailConfirmationRedirectUrl = `${frontendURL}/login?email_confirmed=true`;

  console.log("Using email confirmation redirect URL:", emailConfirmationRedirectUrl);

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdmin();
  } catch (adminError) {
    console.error("Failed to initialize Supabase admin client:", adminError);
    return new Response(
      JSON.stringify({
        error: "Server configuration error",
        details: adminError.message || "Failed to initialize admin connection",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Check if admin email already exists
  const emailCheck = await checkEmailExists(adminEmail);
  if (emailCheck.exists && emailCheck.response) {
    return emailCheck.response;
  }

  try {
    // Generate school code and create relevant entries
    const schoolCode = await generateSchoolCode(supabaseAdmin);
    console.log(`Generated school code: ${schoolCode}`);
    
    await createSchoolCodeEntry(supabaseAdmin, schoolCode, schoolName);
    console.log(`Created school code entry for ${schoolName} with code ${schoolCode}`);

    let schoolId;
    try {
      schoolId = await createSchoolRecord(supabaseAdmin, schoolName, schoolCode);
      console.log(`Created school record with ID: ${schoolId}`);
    } catch (err) {
      console.error("Failed to create school record:", err);
      await cleanupSchoolCodeOnFailure(supabaseAdmin, schoolCode);
      throw err;
    }

    // Create admin user with email confirmation link
    let adminUserId;
    try {
      adminUserId = await createAdminUser(
        supabaseAdmin,
        adminEmail,
        adminPassword,
        adminFullName,
        schoolCode,
        schoolName,
        emailConfirmationRedirectUrl,
      );
      console.log(`Admin user created with ID: ${adminUserId}`);
    } catch (err: any) {
      console.error("Failed to create admin user:", err);
      await cleanupOnFailure(supabaseAdmin, undefined, schoolId, schoolCode);

      if (err.message && err.message.includes("already registered")) {
        return new Response(
          JSON.stringify({
            error: "Email already registered",
            message:
              "This email address is already registered. Please use a different email or log in.",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw err;
    }

    // Create related records: profile and teacher with supervisor role
    try {
      await createProfileRecord(supabaseAdmin, adminUserId, adminFullName, schoolCode, schoolName);
      console.log(`Profile record created for user ID: ${adminUserId}`);
      
      await createTeacherRecord(supabaseAdmin, adminUserId, schoolId);
      console.log(`Teacher record created for user ID: ${adminUserId} as school supervisor`);
    } catch (err) {
      console.error("Failed to create related records:", err);
      await cleanupOnFailure(supabaseAdmin, adminUserId, schoolId, schoolCode);
      throw err;
    }

    const result: RegistrationResult = {
      success: true,
      schoolId,
      schoolCode,
      adminUserId,
      emailSent: true,
      emailError: null,
      message:
        "School and admin account successfully created. Please check your email to verify your account before logging in.",
    };

    console.log("School registration completed successfully");
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred.",
        details: error.stack || "No stack trace available.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}
