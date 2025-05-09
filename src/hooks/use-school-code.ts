
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UseSchoolCodeReturn {
  generateCode: (schoolId: string) => Promise<string | null>;
  validateCode: (code: string) => Promise<boolean>;
  isGenerating: boolean;
  isValidating: boolean;
  generateStudentCode: () => Promise<string | null>;
  isGeneratingStudentCode: boolean;
}

export function useSchoolCode(): UseSchoolCodeReturn {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isGeneratingStudentCode, setIsGeneratingStudentCode] = useState(false);

  const generateCode = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      toast.error("No school ID provided");
      return null;
    }

    setIsGenerating(true);
    try {
      console.log("Generating school code for ID:", schoolId);
      // Instead of using RPC that could trigger infinite recursion, use direct function invocation
      const { data, error } = await supabase.functions.invoke("generate-school-code", {
        body: { schoolId }
      });

      if (error) {
        console.error("Error generating school code:", error);
        toast.error("Failed to generate school code");
        return null;
      }

      console.log("School code generated successfully:", data?.code);
      return data?.code || null;
    } catch (error) {
      console.error("Exception while generating school code:", error);
      toast.error("An unexpected error occurred");
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const validateCode = useCallback(async (code: string): Promise<boolean> => {
    if (!code) return false;

    setIsValidating(true);
    try {
      // Direct validation without using RPC
      const { data, error } = await supabase
        .from("schools")
        .select("id")
        .eq("code", code)
        .maybeSingle();

      if (error) {
        console.error("Error validating school code:", error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error("Exception while validating school code:", error);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const generateStudentCode = useCallback(async (): Promise<string | null> => {
    setIsGeneratingStudentCode(true);
    try {
      console.log("Generating student invite code");
      
      // Call the generate-student-invite edge function
      const { data, error } = await supabase.functions.invoke("generate-student-invite", {
        body: { method: "code" }
      });

      if (error) {
        console.error("Error generating student invite code:", error);
        toast.error("Failed to generate student invite code");
        return null;
      }

      console.log("Student code generated successfully:", data);
      return data?.code || null;
    } catch (error) {
      console.error("Exception while generating student code:", error);
      toast.error("An unexpected error occurred");
      return null;
    } finally {
      setIsGeneratingStudentCode(false);
    }
  }, []);

  return {
    generateCode,
    validateCode,
    isGenerating,
    isValidating,
    generateStudentCode,
    isGeneratingStudentCode
  };
}
