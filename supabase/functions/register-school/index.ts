import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SchoolRegistrationData {
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
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
    
    // Create a Supabase client with the service role key (for admin operations)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceRoleKey: !!supabaseServiceRoleKey
      });
      
      return new Response(
        JSON.stringify({ error: "Server configuration error - missing Supabase credentials" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create the Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    // Check if email already exists FIRST before creating any resources
    try {
      // First check using auth.admin.listUsers
      const { data: existingUsers, error: emailCheckError } = await supabaseAdmin.auth.admin.listUsers({
        filter: {
          email: adminEmail
        }
      });

      // If there was an error checking for existing users, try a different approach
      if (emailCheckError) {
        console.error("Error checking for existing users with listUsers:", emailCheckError);
        
        // Try checking if we can sign in with this email
        const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: adminEmail,
          password: "dummy-password-for-check"
        });
        
        // If there's no error or the error is not about invalid credentials, email might exist
        if (!signInError || (signInError && !signInError.message.includes("Invalid login credentials"))) {
          console.log("Email appears to exist based on signIn check:", adminEmail);
          return new Response(
            JSON.stringify({ 
              error: "Email already registered", 
              message: "This email address is already registered. Please use a different email address. Each user can only have one role in the system."
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
      }

      // If there are users with this email, return an error
      if (existingUsers && existingUsers.users.length > 0) {
        console.log("Email already exists:", adminEmail);
        return new Response(
          JSON.stringify({ 
            error: "Email already registered", 
            message: "This email address is already registered. Please use a different email address. Each user can only have one role in the system."
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } catch (checkError) {
      console.error("Error during email existence check:", checkError);
      // Continue anyway, the createUser call will fail if the email exists
    }
    
    // Generate a school code
    const { data: schoolCodeData, error: schoolCodeError } = await supabaseAdmin.rpc(
      "generate_school_code"
    );
    
    if (schoolCodeError) {
      console.error("Error generating school code:", schoolCodeError);
      return new Response(
        JSON.stringify({ error: "Failed to generate school code", details: schoolCodeError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const schoolCode = schoolCodeData;
    console.log(`Generated school code: ${schoolCode}`);
    
    // First create the entry in school_codes table
    const { error: schoolCodeInsertError } = await supabaseAdmin
      .from("school_codes")
      .insert({
        code: schoolCode,
        school_name: schoolName,
        active: true
      });
    
    if (schoolCodeInsertError) {
      console.error("Error inserting school code:", schoolCodeInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to register school code", details: schoolCodeInsertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create the school record
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
      
      // Clean up the school_code entry
      try {
        await supabaseAdmin
          .from("school_codes")
          .delete()
          .eq("code", schoolCode);
        console.log("Cleaned up school_codes after failed school creation");
      } catch (cleanupError) {
        console.error("Error during cleanup of school_codes:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to create school record", details: schoolError?.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const schoolId = schoolData.id;
    console.log(`School created with ID: ${schoolId}`);
    
    // Set up redirect URL for email confirmation
    const redirectURL = `${frontendURL}/login?email_confirmed=true`;
    console.log(`Email confirmation redirect URL: ${redirectURL}`);
    
    // Create the admin user with auth.admin
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
      
      // Clean up: remove school if user creation fails
      try {
        await supabaseAdmin
          .from("schools")
          .delete()
          .eq("id", schoolId);
        
        await supabaseAdmin
          .from("school_codes")
          .delete()
          .eq("code", schoolCode);
          
        console.log("Cleaned up school and code entries after user creation failed");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      // Special handling for "already registered" errors
      if (userError.message.includes("already registered")) {
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
        
      return new Response(
        JSON.stringify({ error: "Failed to create admin user account", details: userError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    if (!userData || !userData.user) {
      console.error("No user data returned when creating admin");
      
      // Clean up
      try {
        await supabaseAdmin.from("schools").delete().eq("id", schoolId);
        await supabaseAdmin.from("school_codes").delete().eq("code", schoolCode);
        console.log("Cleaned up after failed user creation (no user data returned)");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to create admin user - no user data returned" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const adminUserId = userData.user.id;
    console.log(`Admin user created with ID: ${adminUserId}`);
    
    // Create profile record
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
    
    // Create teacher record with supervisor privileges
    const { error: teacherError } = await supabaseAdmin
      .from("teachers")
      .insert({
        id: adminUserId,
        school_id: schoolId,
        is_supervisor: true
      });
    
    if (teacherError) {
      console.error("Error creating teacher record:", teacherError);
      
      // Clean up: remove user if teacher record creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(adminUserId);
        await supabaseAdmin.from("profiles").delete().eq("id", adminUserId);
        await supabaseAdmin.from("schools").delete().eq("id", schoolId);
        await supabaseAdmin.from("school_codes").delete().eq("code", schoolCode);
        console.log("Cleaned up after teacher record creation failed");
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError);
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to create teacher admin record", details: teacherError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Make multiple attempts to send confirmation email to improve delivery reliability
    let emailSent = false;
    let emailError = null;
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Attempt ${attempt} of ${maxAttempts} to send confirmation email to ${adminEmail}...`);
        
        const { data: emailData, error: resendError } = await supabaseAdmin.auth.admin.resendUserConfirmationEmail(adminEmail);
        
        if (resendError) {
          console.error(`Attempt ${attempt}: Error sending confirmation email:`, resendError);
          emailError = resendError;
          
          if (attempt === maxAttempts) {
            console.error(`All ${maxAttempts} attempts to send email failed.`);
          } else {
            // Wait a short time before trying again (500ms)
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } else {
          console.log(`Confirmation email sent to ${adminEmail} on attempt ${attempt}. Response:`, emailData);
          emailSent = true;
          break; // Email sent successfully, exit the loop
        }
      } catch (attemptError) {
        console.error(`Attempt ${attempt}: Failed to send confirmation email:`, attemptError);
        emailError = attemptError;
        
        if (attempt === maxAttempts) {
          console.error(`All ${maxAttempts} attempts to send email failed.`);
        } else {
          // Wait before trying again
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    // Return success with school and admin info
    return new Response(
      JSON.stringify({ 
        success: true, 
        schoolId, 
        schoolCode,
        adminUserId,
        emailSent,
        emailError: emailError ? emailError.message : null,
        message: emailSent 
          ? "School and admin account successfully created. Please check your email (including spam folder) to verify your account." 
          : "School and admin account created, but there was a problem sending the verification email. Please use the 'Forgot Password' option on the login page to request another verification email."
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
    
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "An unexpected error occurred", 
        details: error.message || "Unknown error",
        stack: error.stack || "No stack trace available" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
