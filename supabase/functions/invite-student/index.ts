import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  console.log("Incoming request method:", req.method);
  console.log("Authorization header present:", !!req.headers.get("Authorization"));

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    // Validate that this is a POST request
    if (req.method !== "POST") {
      console.error("Invalid request method:", req.method);
      return new Response(JSON.stringify({
        error: "Method not allowed. Please use POST."
      }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header type:", typeof authHeader);
    
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(JSON.stringify({
        error: "Unauthorized: No authorization header"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    // Extract token from the Authorization header (supports both "Bearer token" and raw token formats)
    const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
    console.log("Token extracted, length:", token.length);

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: `Bearer ${token}` }
        }
      }
    );

    // Verify the user is logged in
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error("Unauthorized request:", userError);
      return new Response(JSON.stringify({
        error: "Unauthorized: Invalid credentials",
        details: userError?.message || "User authentication failed"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    console.log("Authenticated user ID:", user.id);

    // Get the school_id of the logged in user using the database function
    console.log("Calling get_user_school_id RPC function");
    const { data: schoolIdData, error: schoolIdError } = await supabaseClient.rpc("get_user_school_id");
    
    // Log the response to help debug
    console.log("get_user_school_id response data:", schoolIdData);
    console.log("get_user_school_id response error:", schoolIdError);
    
    if (schoolIdError) {
      console.error("Error getting school ID:", schoolIdError);
      return new Response(JSON.stringify({
        error: "Failed to retrieve school ID",
        details: schoolIdError.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // Handle the school ID response - RPC returns a scalar value directly
    const schoolId = schoolIdData;
    
    if (!schoolId) {
      console.error("No school ID returned");
      return new Response(JSON.stringify({
        error: "No school ID associated with user",
        details: "User may not be connected to a school"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    console.log("Processing request for school ID:", schoolId);

    // Parse and validate the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Request body:", requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(JSON.stringify({
        error: "Invalid JSON in request body"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    const { method, email } = requestBody;
    
    // Validate the method parameter
    if (!method || (method !== "code" && method !== "email")) {
      console.error("Invalid method parameter:", method);
      return new Response(JSON.stringify({
        error: "Invalid method parameter. Must be 'code' or 'email'",
        received: { method }
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    
    // Validate email if method is email
    if (method === "email" && (!email || !email.includes('@'))) {
      console.error("Invalid email parameter:", email);
      return new Response(JSON.stringify({
        error: "Invalid email address",
        received: { email }
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }

    console.log("Request body valid:", { method, email });

    // Generate a random code
    const generateCode = () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing characters
      let result = "";
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // Create timestamp for proper record-keeping
    const now = new Date().toISOString();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days from now
    const expires_at = expiryDate.toISOString();

    // Handle invite by code
    if (method === "code") {
      console.log("Generating invitation code");
      const inviteCode = generateCode();
      console.log("Generated invite code:", inviteCode);

      // Insert into student_invites table with explicit timestamps
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          code: inviteCode,
          school_id: schoolId,
          status: "pending",
          created_at: now,
          expires_at: expires_at
        })
        .select();

      if (inviteError) {
        console.error("Error creating invitation:", inviteError);
        return new Response(JSON.stringify({
          error: "Failed to create invitation",
          details: inviteError.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }

      return new Response(JSON.stringify({
        message: "Student invite code generated successfully",
        code: inviteCode,
        created_at: now,
        expires_at: expires_at
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    } 
    // Handle invite by email
    else if (method === "email") {
      console.log("Creating email invitation for:", email);
      const inviteCode = generateCode();

      // Create an invitation record with explicit timestamps
      const { data: inviteData, error: inviteError } = await supabaseClient
        .from("student_invites")
        .insert({
          code: inviteCode,
          email: email,
          school_id: schoolId,
          status: "pending",
          created_at: now,
          expires_at: expires_at
        })
        .select();

      if (inviteError) {
        console.error("Error creating invitation:", inviteError);
        return new Response(JSON.stringify({
          error: "Failed to create invitation",
          details: inviteError.message
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }

      console.log(`Invite code ${inviteCode} created for email ${email}`);
      return new Response(JSON.stringify({
        message: "Student invitation created successfully",
        code: inviteCode,
        email: email,
        created_at: now,
        expires_at: expires_at
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      details: error?.message || "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
