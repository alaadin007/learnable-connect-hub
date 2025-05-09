
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteStudentBody {
  method: "code" | "email";
  email?: string;
}

function generateInviteCode(): string {
  const prefix = 'STU';
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking characters
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${prefix}${result}`;
}

serve(async (req) => {
  // Log request details
  console.log("Invite student request:", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries([...req.headers]),
    timestamp: new Date().toISOString()
  });
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify the user is logged in
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "You must be logged in to invite students" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the school_id of the logged in user
    const { data: schoolIdData, error: schoolIdError } = await supabaseClient
      .rpc("get_user_school_id");

    // If RPC fails, try to get school_id directly from profiles
    let schoolId: string | null = null;
    if (schoolIdError || !schoolIdData) {
      console.warn("RPC failed to get school_id, falling back to direct query:", schoolIdError);
      
      const { data: profileData, error: profileError } = await supabaseClient
        .from("profiles")
        .select("school_id")
        .eq("id", user.id)
        .single();
        
      if (profileError || !profileData?.school_id) {
        console.error("Could not determine school ID:", profileError);
        return new Response(
          JSON.stringify({ error: "Configuration Error", message: "Could not determine your school ID" }),
          { 
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      schoolId = profileData.school_id;
    } else {
      schoolId = schoolIdData;
    }
    
    console.log("School ID for invitation:", schoolId);

    // Parse the request body
    let requestBody: InviteStudentBody;
    try {
      requestBody = await req.json() as InviteStudentBody;
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid JSON body" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    const { method, email } = requestBody;
    console.log("Invite method:", method, "Email:", email);

    // Handle invite by code
    if (method === "code") {
      // Generate a unique invite code
      const inviteCode = generateInviteCode();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // Expires in 7 days
      
      console.log("Generated invite code:", inviteCode);

      // Create an invitation record
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          code: inviteCode,
          school_id: schoolId,
          teacher_id: user.id,
          status: "pending",
          expires_at: expirationDate.toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invitation:", inviteError);
        return new Response(
          JSON.stringify({ error: "Database Error", message: "Failed to create invitation" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          message: "Student invite code generated successfully",
          data: { code: inviteCode, expires_at: expirationDate.toISOString() }
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    // Handle invite by email
    else if (method === "email" && email) {
      // Generate a unique invite code for tracking
      const inviteCode = generateInviteCode();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // Expires in 7 days

      // Create an invitation record
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          code: inviteCode,
          email: email,
          school_id: schoolId,
          teacher_id: user.id,
          status: "pending",
          expires_at: expirationDate.toISOString()
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Error creating invitation:", inviteError);
        return new Response(
          JSON.stringify({ error: "Database Error", message: "Failed to create invitation" }),
          { 
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // In a production app, you would send an email here with the invite code
      console.log(`Invite code ${inviteCode} created for email ${email}`);

      return new Response(
        JSON.stringify({ 
          message: "Student invitation created successfully",
          data: { 
            code: inviteCode,
            email: email,
            expires_at: expirationDate.toISOString()
          }
        }),
        { 
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ error: "Bad Request", message: "Invalid or missing parameters" }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
