
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
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { email } = await req.json() as ResendVerificationRequest;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log(`Attempting to resend verification email to: ${email}`);
    
    // Check if user exists
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      filter: {
        email: email,
      },
    });
    
    if (authError) {
      console.error("Error checking for existing user:", authError);
      return new Response(
        JSON.stringify({ error: "Error checking for user: " + authError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    if (!authData || !authData.users || authData.users.length === 0) {
      console.log("User not found:", email);
      return new Response(
        JSON.stringify({ error: "Email not registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const user = authData.users[0];
    
    // Check if email is already confirmed
    if (user.email_confirmed_at) {
      console.log("Email already verified:", email);
      return new Response(
        JSON.stringify({ message: "Email already verified", already_verified: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Generate a new verification link
    const { data: linkData, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email: email,
    });

    if (verificationError) {
      console.error("Error generating verification link:", verificationError);
      return new Response(
        JSON.stringify({ error: verificationError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Verification email resent to: ${email}`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email has been resent. Please check your inbox.",
        email_verification_sent: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in resend-verification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
