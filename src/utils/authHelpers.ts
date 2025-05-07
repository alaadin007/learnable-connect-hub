
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    // Check auth.users directly (most accurate)
    const { data: userData, error: userError } = await supabase.rpc(
      "check_if_email_exists", 
      { input_email: email }
    );
    
    if (userError) {
      console.error("Error checking email with RPC:", userError);
      
      // Fallback to checking profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error checking email in profiles:", error);
        return false;
      }

      return !!data;
    }
    
    return !!userData;
  } catch (error) {
    console.error("Error during email check:", error);
    return false;
  }
};

export const validateSchoolCode = async (schoolCode: string): Promise<{ isValid: boolean; schoolId?: string }> => {
  try {
    // First try using the RPC function
    const { data: validCode, error: validationError } = await supabase.rpc(
      "verify_school_code",
      { code: schoolCode }
    );
    
    if (!validationError && validCode) {
      // Get the school ID using the code
      const { data, error } = await supabase
        .from("schools")
        .select("id")
        .eq("code", schoolCode)
        .single();

      if (error) {
        console.error("Error getting school ID:", error);
        return { isValid: true }; // Code is valid but couldn't get ID
      }

      return { isValid: true, schoolId: data.id };
    }
    
    if (validationError) {
      console.error("Error validating with RPC:", validationError);
      
      // Fallback to direct query
      const { data, error } = await supabase
        .from("schools")
        .select("id")
        .eq("code", schoolCode)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error validating school code:", error);
        return { isValid: false };
      }

      return { isValid: !!data, schoolId: data?.id };
    }
    
    return { isValid: !!validCode };
  } catch (error) {
    console.error("Error validating school code:", error);
    return { isValid: false };
  }
};

export const createUserProfile = async (
  userId: string,
  email: string,
  userType: string,
  schoolId?: string,
  fullName?: string
) => {
  const profileData = {
    id: userId,
    email,
    user_type: userType,
    school_id: schoolId,
    full_name: fullName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log("Creating user profile:", profileData);

  try {
    const { error } = await supabase
      .from("profiles")
      .upsert([profileData]);

    if (error) {
      console.error("Profile creation error:", error);
      throw new Error(`Failed to create profile: ${error.message}`);
    }
    
    console.log("Profile created successfully");
    return true;
  } catch (error: any) {
    console.error("Error in createUserProfile:", error);
    throw error;
  }
};

export const assignUserRole = async (userId: string, role: string) => {
  try {
    console.log("Assigning role:", role, "to user:", userId);
    
    const { error } = await supabase.rpc("assign_role", {
      user_id_param: userId,
      role_param: role
    });

    if (error) {
      console.error("Role assignment error:", error);
      throw new Error(`Failed to assign role: ${error.message}`);
    }
    
    console.log("Role assigned successfully");
    return true;
  } catch (error: any) {
    console.error("Error in assignUserRole:", error);
    throw error;
  }
};

export const handleRegistrationError = (error: any) => {
  console.error("Registration error:", error);
  
  const errorMessage = error.message || "Unknown error";
  
  if (errorMessage.includes("duplicate key") || errorMessage.includes("already exists")) {
    toast.error("This email is already registered", {
      description: "Please use a different email address or try to log in.",
    });
  } else if (errorMessage.includes("invalid email")) {
    toast.error("Invalid email format", {
      description: "Please enter a valid email address.",
    });
  } else if (errorMessage.includes("password")) {
    toast.error("Password issue", {
      description: "Password must be at least 8 characters long and contain both letters and numbers.",
    });
  } else if (errorMessage.includes("school")) {
    toast.error("School registration issue", {
      description: "There was a problem registering your school. Please try again.",
    });
  } else if (errorMessage.includes("policy")) {
    toast.error("Database policy error", {
      description: "There was an issue with database permissions. Please contact support.",
    });
  } else if (errorMessage.includes("recursion")) {
    toast.error("Database recursion error", {
      description: "There was an internal database issue. Please try again later.",
    });
  } else {
    toast.error("Registration failed", {
      description: "An unexpected error occurred. Please try again or contact support.",
    });
  }
}; 
