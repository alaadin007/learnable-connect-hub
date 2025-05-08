
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface UseSchoolCodeReturn {
  generateCode: (schoolId: string) => Promise<string | null>;
  validateCode: (code: string) => Promise<boolean>;
  isGenerating: boolean;
  isValidating: boolean;
}

export function useSchoolCode(): UseSchoolCodeReturn {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const generateCode = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      toast.error("No school ID provided");
      return null;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc("generate_new_school_code", {
        school_id_param: schoolId,
      });

      if (error) {
        console.error("Error generating school code:", error);
        toast.error("Failed to generate school code");
        return null;
      }

      return data;
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
      const { data, error } = await supabase.rpc("verify_school_code", {
        code,
      });

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

  return {
    generateCode,
    validateCode,
    isGenerating,
    isValidating,
  };
}
