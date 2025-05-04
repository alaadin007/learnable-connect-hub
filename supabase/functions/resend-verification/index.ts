
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.32.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendVerificationRequest {
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    console.log("Resend verification function called");

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
    
    const { email } = requestBody as ResendVerificationRequest;

    // Validate required fields
    if (!email) {
      console.error("Missing email in request");
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Checking if user exists:", email);
    
    // Check if the user exists
    const { data: userData, error: userLookupError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userLookupError) {
      console.error("Error looking up user:", userLookupError);
      return new Response(
        JSON.stringify({ error: "Error looking up user: " + userLookupError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Find the user with this email
    const user = userData?.users?.find(u => u.email === email);
    
    if (!user) {
      console.error("User not found:", email);
      return new Response(
        JSON.stringify({ error: "User not found with the provided email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("Sending verification email to:", email);
    
    try {
      const { data: linkData, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
      });

      if (verificationError) {
        console.error("Error generating verification link:", verificationError);
        return new Response(
          JSON.stringify({ error: "Failed to send verification email: " + verificationError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      console.log("Verification email sent successfully to:", email);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Verification email sent. Please check your inbox." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } catch (verificationError: any) {
      console.error("Exception while sending verification email:", verificationError);
      return new Response(
        JSON.stringify({ error: "Failed to send verification email: " + verificationError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in resend-verification function:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred: " + (error instanceof Error ? error.message : String(error)) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
