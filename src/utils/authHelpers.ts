
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Resends verification email to a user
 * @param email The email address to resend verification to
 * @returns Promise with the result of the operation
 */
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    toast.loading("Sending verification email...");
    
    const { data, error } = await supabase.functions.invoke("resend-verification", {
      body: { email },
    });

    if (error) {
      console.error("Error resending verification email:", error);
      toast.dismiss();
      toast.error("Failed to resend verification email");
      return { 
        success: false, 
        message: `Failed to resend verification email: ${error.message}` 
      };
    }

    if (data && data.error) {
      console.error("Error from resend-verification function:", data.error);
      toast.dismiss();
      toast.error("Failed to resend verification email");
      return {
        success: false,
        message: `Failed to resend verification email: ${data.error}`
      };
    }

    if (data && data.already_verified) {
      toast.dismiss();
      toast.info("Email already verified", {
        description: "You can now log in with your credentials."
      });
      return {
        success: true,
        message: "This email address has already been verified."
      };
    }

    toast.dismiss();
    toast.success("Verification email sent", {
      description: "Please check your inbox and spam folder."
    });
    return { 
      success: true, 
      message: "Verification email has been resent. Please check your inbox." 
    };
  } catch (error: any) {
    console.error("Error in resendVerificationEmail:", error);
    toast.dismiss();
    toast.error("Failed to resend verification email");
    return { 
      success: false, 
      message: `An unexpected error occurred: ${error.message}` 
    };
  }
};

/**
 * Handles requesting a password reset
 * @param email The email address to send password reset to
 * @returns Promise with the result of the operation
 */
export const requestPasswordReset = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("Error requesting password reset:", error);
      return { 
        success: false, 
        message: `Failed to send password reset email: ${error.message}` 
      };
    }

    return { 
      success: true, 
      message: "Password reset email has been sent. Please check your inbox." 
    };
  } catch (error: any) {
    console.error("Error in requestPasswordReset:", error);
    return { 
      success: false, 
      message: `An unexpected error occurred: ${error.message}` 
    };
  }
};
