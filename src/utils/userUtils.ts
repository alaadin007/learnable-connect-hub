
import { supabase } from "@/integrations/supabase/client";

/**
 * Helper function to check if the current user is a school admin
 */
export const isUserSchoolAdmin = async (): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    // Check if they are a supervisor teacher
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("is_supervisor")
      .eq("id", user.id)
      .single();
      
    return !!teacherData?.is_supervisor;
  } catch (error) {
    console.error("Error checking if user is school admin:", error);
    return false;
  }
};

/**
 * Helper function to check if the current user is a teacher
 */
export const isUserTeacher = async (): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    // Check if there is a record in the teachers table
    const { data: teacherData, error } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
      
    return !!teacherData && !error;
  } catch (error) {
    console.error("Error checking if user is teacher:", error);
    return false;
  }
};

/**
 * Helper function to check if the current user is a student
 */
export const isUserStudent = async (): Promise<boolean> => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return false;
    }
    
    // Check if there is a record in the students table
    const { data: studentData, error } = await supabase
      .from("students")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
      
    return !!studentData && !error;
  } catch (error) {
    console.error("Error checking if user is student:", error);
    return false;
  }
};

/**
 * Get the user's profile from the profiles table
 */
export const getUserProfile = async () => {
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }
    
    // Get user profile
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
      
    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};

/**
 * Get the current user's role from their profile
 */
export const getUserRole = async (): Promise<string | null> => {
  try {
    const profile = await getUserProfile();
    return profile?.user_type || null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
};
