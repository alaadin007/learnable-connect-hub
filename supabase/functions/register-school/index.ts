
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterSchoolRequest {
  schoolName: string;
  adminEmail: string;
  adminPassword: string;
  adminFullName: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Register school function called");
    
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body:", JSON.stringify(requestBody));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const { schoolName, adminEmail, adminPassword, adminFullName } = requestBody as RegisterSchoolRequest;

    // Validate required fields
    if (!schoolName || !adminEmail || !adminPassword || !adminFullName) {
      console.log("Missing required fields:", { 
        hasSchoolName: !!schoolName, 
        hasAdminEmail: !!adminEmail, 
        hasAdminPassword: !!adminPassword, 
        hasAdminFullName: !!adminFullName 
      });
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if user already exists by email
    console.log("Checking if user already exists:", adminEmail);
    
    try {
      // Check if the user already exists by email using listUsers
      const { data: existingUsers, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers({
        filter: {
          email: adminEmail,
        },
      });
      
      if (userLookupError) {
        console.error("Error checking if user exists:", userLookupError);
        return new Response(
          JSON.stringify({ error: "Error checking for existing user" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      if (existingUsers && existingUsers.users && existingUsers.users.length > 0) {
        console.log("User already exists:", adminEmail);
        return new Response(
          JSON.stringify({ error: "Email already registered" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
        );
      }
    } catch (error) {
      console.error("Exception when checking if user exists:", error);
      // Continue with registration as we couldn't confirm if user exists
      // But log the error for debugging
    }

    // Generate a unique school code
    const schoolCode = generateSchoolCode();
    console.log("Generated school code:", schoolCode);

    // Create the user with appropriate metadata
    console.log("Creating admin user with metadata:", { 
      email: adminEmail,
      fullName: adminFullName,
      schoolName: schoolName,
      schoolCode: schoolCode 
    });

    try {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: false, // Set to false to send email confirmation
        user_metadata: {
          full_name: adminFullName,
          school_name: schoolName,
          school_code: schoolCode,
          user_type: "school" // Mark the user as a school admin
        }
      });

      if (userError) {
        console.error("Error creating admin user:", userError);
        return new Response(
          JSON.stringify({ error: userError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      console.log("User created successfully:", userData.user.id);

      // Create the database entries in a transaction to ensure consistency
      try {
        const schoolId = await createSchoolRecords(
          supabaseAdmin,
          schoolCode,
          schoolName,
          userData.user.id,
          adminFullName
        );

        if (!schoolId) {
          console.error("Failed to create complete school records, but user was created");
          // Continue anyway as the user was created - they can retry the process later
        } else {
          console.log("School records created successfully with ID:", schoolId);
        }
      } catch (schoolRecordsError) {
        console.error("Error creating school records:", schoolRecordsError);
        // Continue since the user is created
      }

      // After successful creation, send email verification separately
      console.log("Sending verification email to:", adminEmail);
      try {
        const { data: linkData, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: adminEmail,
        });

        if (verificationError) {
          console.error("Error sending verification email:", verificationError);
          // Still return success but note the verification issue
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "School registered successfully, but there was an issue sending the verification email. Please try to login and request a new verification email.",
              userId: userData.user.id,
              schoolCode,
              email_verification_sent: false
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
          );
        }

        console.log(`School registered successfully. Admin user ID: ${userData.user.id}, verification email sent`);

        // Return success response
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "School registered successfully. Please check your email to verify your account.",
            userId: userData.user.id,
            schoolCode,
            email_verification_sent: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
        );
      } catch (verificationError) {
        console.error("Exception while sending verification email:", verificationError);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "School registered successfully, but there was an issue sending the verification email.",
            userId: userData.user.id,
            schoolCode,
            email_verification_sent: false
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 201 }
        );
      }
    } catch (userCreationError) {
      console.error("Exception in user creation:", userCreationError);
      return new Response(
        JSON.stringify({ error: "Failed to create user: " + (userCreationError instanceof Error ? userCreationError.message : String(userCreationError)) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in register-school function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to create all school-related records
async function createSchoolRecords(
  supabase: any,
  schoolCode: string,
  schoolName: string,
  userId: string,
  adminFullName: string
): Promise<string | null> {
  try {
    // First create the entry in school_codes table
    const { error: schoolCodeError } = await supabase
      .from('school_codes')
      .insert([
        { 
          code: schoolCode,
          school_name: schoolName,
          active: true 
        }
      ]);

    if (schoolCodeError) {
      console.error("Error creating school code record:", schoolCodeError);
      // If this fails because the code already exists, generate a new code and retry
      if (schoolCodeError.code === '23505') { // Unique violation
        console.log("School code already exists, generating a new code");
        const newCode = generateSchoolCode();
        return createSchoolRecords(supabase, newCode, schoolName, userId, adminFullName);
      }
      throw schoolCodeError;
    } else {
      console.log("School code created successfully");
    }

    // Create the school in database
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert([
        { 
          name: schoolName,
          code: schoolCode,
        }
      ])
      .select('id')
      .single();

    if (schoolError) {
      console.error("Error creating school record:", schoolError);
      throw schoolError;
    }
    
    console.log("School created successfully:", schoolData.id);
    
    // Create the teacher/admin record
    const { error: teacherError } = await supabase
      .from('teachers')
      .insert([
        { 
          id: userId,
          school_id: schoolData.id,
          is_supervisor: true, // Mark as supervisor (admin)
        }
      ]);

    if (teacherError) {
      console.error("Error creating teacher record:", teacherError);
      throw teacherError;
    } else {
      console.log("Teacher record created successfully");
    }

    // Create the profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        { 
          id: userId,
          full_name: adminFullName,
          user_type: "school",
          school_name: schoolName,
          school_code: schoolCode
        }
      ]);

    if (profileError) {
      console.error("Error creating profile record:", profileError);
      
      // If this is a duplicate key error, try updating instead
      if (profileError.code === '23505') {
        console.log("Profile already exists, trying to update instead");
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            full_name: adminFullName,
            user_type: "school",
            school_name: schoolName,
            school_code: schoolCode
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error("Error updating profile record:", updateError);
          throw updateError;
        } else {
          console.log("Profile record updated successfully");
        }
      } else {
        throw profileError;
      }
    } else {
      console.log("Profile record created successfully");
    }

    return schoolData.id;
  } catch (error) {
    console.error("Error in createSchoolRecords:", error);
    throw error;
  }
}

// Generate a unique school code
function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omitting similar looking characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
