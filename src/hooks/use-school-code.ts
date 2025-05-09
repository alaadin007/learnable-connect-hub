
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
      const { data, error } = await supabase.functions.invoke("generate-school-code", {
        body: { schoolId }
      });

      if (error) {
        console.error("Error generating school code:", error);
        toast.error("Failed to generate school code");
        return null;
      }

      // Handle API error responses
      if (data?.error) {
        console.error("API error generating school code:", data.error);
        
        if (data.error === 'Rate Limit') {
          toast.error("Too many code generations in 24 hours. Please try again later.");
        } else {
          toast.error(data.message || "Failed to generate school code");
        }
        
        return null;
      }

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
        .select("id, code_expires_at")
        .eq("code", code)
        .maybeSingle();

      if (error) {
        console.error("Error validating school code:", error);
        return false;
      }

      // Check if code exists and has not expired
      if (!data) return false;
      
      // Check expiration if it's set
      if (data.code_expires_at) {
        const expiresAt = new Date(data.code_expires_at);
        if (expiresAt < new Date()) {
          console.log("School code has expired:", code);
          return false;
        }
      }

      return true;
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
