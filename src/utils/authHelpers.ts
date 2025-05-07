import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("email")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Error checking email:", error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error("Error during email check:", error);
    return false;
  }
};

export const validateSchoolCode = async (schoolCode: string): Promise<{ isValid: boolean; schoolId?: string }> => {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("id")
      .eq("code", schoolCode)
      .single();

    if (error) {
      return { isValid: false };
    }

    return { isValid: true, schoolId: data.id };
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

  const { error } = await supabase
    .from("profiles")
    .upsert([profileData]);

  if (error) {
    throw new Error(`Failed to create profile: ${error.message}`);
  }
};

export const assignUserRole = async (userId: string, role: string) => {
  const { error } = await supabase.rpc("assign_role", {
    user_id_param: userId,
    role_param: role
  });

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`);
  }
};

export const handleRegistrationError = (error: any) => {
  console.error("Registration error:", error);
  
  if (error.message?.includes("duplicate key")) {
    toast.error("This email is already registered. Please use a different email address.");
  } else if (error.message?.includes("invalid email")) {
    toast.error("Please enter a valid email address.");
  } else if (error.message?.includes("password")) {
    toast.error("Password must be at least 8 characters long and contain both letters and numbers.");
  } else {
    toast.error("An error occurred during registration. Please try again.");
  }
  
  throw error;
}; 