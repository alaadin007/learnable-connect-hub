import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterSchoolRequest {
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Setup Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false }});

    // Parse and validate request body
    let requestBody: RegisterSchoolRequest;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    const { schoolName, adminEmail, adminPassword, adminFullName } = requestBody;
    if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check existing user by email
    const { data: existingUsers, error: listUserError } = await supabaseAdmin.auth.admin.listUsers({ filters: { email: adminEmail } });
    if (listUserError) {
      console.error("Error listing users:", listUserError);
      return new Response(
        JSON.stringify({ error: "Error checking existing users" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    if (existingUsers?.users?.some((u) => u.email === adminEmail)) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Generate a unique school code
    const schoolCode = generateSchoolCode();

    // Insert school code
    const { error: schoolCodeError } = await supabaseAdmin.from("school_codes").insert({ code: schoolCode, school_name: schoolName, active: true });
    if (schoolCodeError) throw schoolCodeError;

    // Insert school record
    const { data: schoolData, error: schoolError } = await supabaseAdmin.from("schools").insert({ name: schoolName, code: schoolCode }).select("id").maybeSingle();
    if (schoolError || !schoolData) {
      await supabaseAdmin.from("school_codes").delete().eq("code", schoolCode);
      return new Response(
        JSON.stringify({ error: "Failed to create school record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    const schoolId = schoolData.id;

    // Create admin user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: false, // send verification email later
      user_metadata: {
        full_name: adminFullName,
        user_type: "school",
        school_code: schoolCode,
        school_name: schoolName,
      },
      email_confirm_redirect_url: `${new URL(req.url).origin}/login?email_confirmed=true`,
    });
    if (userError) {
      await supabaseAdmin.from("schools").delete().eq("id", schoolId);
      await supabaseAdmin.from("school_codes").delete().eq("code", schoolCode);
      if (userError.message.includes("already registered")) {
        return new Response(
          JSON.stringify({ error: "Email already registered" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to create admin user", details: userError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    if (!userData?.user?.id) {
      await supabaseAdmin.from("schools").delete().eq("id", schoolId);
      await supabaseAdmin.from("school_codes").delete().eq("code", schoolCode);
      return new Response(
        JSON.stringify({ error: "Admin user creation failed - no user data returned" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    const adminUserId = userData.user.id;

    // Create related records
    await supabaseAdmin.from("teachers").insert({ id: adminUserId, school_id: schoolId, is_supervisor: true });
    await supabaseAdmin.from("profiles").upsert({
      id: adminUserId,
      user_type: "school",
      full_name: adminFullName,
      school_code: schoolCode,
      school_name: schoolName,
    });

    // Attempt to send confirmation email multiple times
    let emailSent = false;
    let emailError = null;
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts; i++) {
      const { error: resendError } = await supabaseAdmin.auth.admin.resendUserConfirmationEmail(adminEmail);
      if (!resendError) {
        emailSent = true;
        break;
      }
      emailError = resendError ?? null;
      await new Promise(res => setTimeout(res, 500)); // wait 500ms before retry
    }

    return new Response(
      JSON.stringify({
        success: true,
        schoolId,
        schoolCode,
        adminUserId,
        emailSent,
        emailError: emailError ? String(emailError) : null,
        message: emailSent
          ? "School registered successfully; please verify your email."
          : "Registered, but failed to send verification email. Please use password reset to resend it.",
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


function generateSchoolCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}