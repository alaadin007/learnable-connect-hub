
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendVerificationRequest {
  email: string;
  currentUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    let requestBody: ResendVerificationRequest;
    try {
      requestBody = await req.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { email, currentUrl } = requestBody;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Checking if user exists:", email);
    console.log("Current URL provided:", currentUrl);
    
    // Check if user exists and is confirmed
    const { data: users, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers({
      filter: {
        email: email
      }
    });

    if (userLookupError) {
      console.error("Error checking for user:", userLookupError);
      return new Response(
        JSON.stringify({ error: "Error checking user: " + userLookupError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    if (!users || users.users.length === 0) {
      console.error("User not found:", email);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const user = users.users[0];
    console.log("User found:", user.id, "Email confirmed:", !!user.email_confirmed_at);

    // Check if user is already confirmed
    if (user.email_confirmed_at) {
      console.log("User already confirmed:", email);
      return new Response(
        JSON.stringify({ 
          message: "Email already verified",
          already_verified: true 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Make sure we use the correct redirect URL
    // Default to http://localhost:3000 if no currentUrl is provided
    const baseUrl = currentUrl || "http://localhost:3000";
    const redirectUrl = `${baseUrl}/login?completeRegistration=true`;
    
    console.log("Final redirect URL:", redirectUrl);

    // Send verification email via a confirmation email
    console.log("Sending verification email to:", email, "with redirect URL:", redirectUrl);
    const { data, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',  // Use signup for email verification
      email: email,
      options: {
        redirectTo: redirectUrl
      }
    });

    if (verificationError) {
      console.error("Error sending verification email:", verificationError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email: " + verificationError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("Verification email sent successfully to:", email, "Response:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ 
        error: error?.message ?? "Unknown error",
        stack: error?.stack ?? "No stack trace available"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
