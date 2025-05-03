
import { corsHeaders } from "./cors.ts";
import { createSupabaseAdmin } from "./supabase-admin.ts";

export async function checkEmailExists(adminEmail: string) {
  const supabaseAdmin = createSupabaseAdmin();
  
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
        password: "dummy-password-for-check-only",
      });
      
      // If there's no error or the error is not about invalid credentials, email might exist
      if (!signInError || (signInError && !signInError.message.includes("Invalid login credentials"))) {
        console.log("Email appears to exist based on signIn check:", adminEmail);
        return {
          exists: true,
          response: new Response(
            JSON.stringify({ 
              error: "Email already registered", 
              message: "This email address is already registered. Please use a different email address. Each user can only have one role in the system."
            }),
            { 
              status: 409, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          )
        };
      }
    }

    // If there are users with this email, return an error
    if (existingUsers && existingUsers.users.length > 0) {
      console.log("Email already exists:", adminEmail);
      return {
        exists: true,
        response: new Response(
          JSON.stringify({ 
            error: "Email already registered", 
            message: "This email address is already registered. Please use a different email address. Each user can only have one role in the system."
          }),
          { 
            status: 409, 
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        )
      };
    }

    return { exists: false };
  } catch (checkError) {
    console.error("Error during email existence check:", checkError);
    // Continue anyway, the createUser call will fail if the email exists
    return { exists: false };
  }
}
