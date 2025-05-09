
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { invokeEdgeFunction } from "@/utils/apiHelpers";

// Types
interface SchoolCodeResponse {
  code: string;
  expires_at?: string;
}

interface ValidationResponse {
  isValid: boolean;
  schoolId?: string;
  schoolName?: string;
  error?: string;
}

interface UseSchoolCodeReturn {
  generateCode: (schoolId: string) => Promise<string | null>;
  validateCode: (code: string) => Promise<ValidationResponse>;
  isGenerating: boolean;
  isValidating: boolean;
  error: string | null;
}

// Constants
const CODE_LENGTH = 9; // 'SCH' prefix + 6 characters
const CODE_PATTERN = /^SCH[A-Z0-9]{6}$/;

// Helper functions
function validateCodeFormat(code: string): boolean {
  return CODE_PATTERN.test(code);
}

export function useSchoolCode(): UseSchoolCodeReturn {
  const { profile } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCode = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!schoolId) {
      const errorMessage = "No school ID provided";
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log("Generating school code for schoolId:", schoolId);
      
      // Try direct database function call first (most reliable)
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc("generate_new_school_code", { school_id_param: schoolId });
          
        if (!rpcError && rpcData) {
          console.log("Generated code via RPC:", rpcData);
          toast.success("School code generated successfully");
          return rpcData;
        } else {
          console.warn("RPC approach returned error:", rpcError);
        }
      } catch (rpcError) {
        console.error("RPC call failed:", rpcError);
      }
      
      // Try with the edge function next
      try {
        console.log("Calling generate-school-code edge function");
        const data = await invokeEdgeFunction<SchoolCodeResponse>("generate-school-code", {
          schoolId: schoolId
        }, {
          requireAuth: true,
          retryCount: 2,
          timeout: 10000
        });
        
        console.log("Response from edge function:", data);
  
        if (data?.code) {
          // Validate the received code format
          if (validateCodeFormat(data.code)) {
            toast.success("School code generated successfully");
            return data.code;
          }
        }
      } catch (edgeError) {
        console.error("Edge function failed:", edgeError);
      }

      // Last resort - direct table update
      console.log("Trying direct table update as fallback");
      const newCode = `SCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const { data, error: updateError } = await supabase
        .from('schools')
        .update({ 
          code: newCode,
          code_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', schoolId)
        .select('code')
        .single();
      
      if (!updateError && data?.code) {
        console.log("Generated code via direct update:", data.code);
        toast.success("School code generated successfully");
        return data.code;
      }

      throw new Error("Failed to generate code through all available methods");

    } catch (error) {
      console.error("Exception while generating school code:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(`Failed to generate school code: ${errorMessage}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const validateCode = useCallback(async (code: string): Promise<ValidationResponse> => {
    if (!code) {
      return {
        isValid: false,
        error: "No code provided"
      };
    }

    if (!validateCodeFormat(code)) {
      return {
        isValid: false,
        error: "Invalid code format. School codes should start with 'SCH' followed by 6 characters."
      };
    }

    setIsValidating(true);
    setError(null);

    try {
      // Get school details along with validation
      const { data, error } = await supabase
        .from("schools")
        .select("id, name, code_expires_at")
        .eq("code", code)
        .maybeSingle();

      if (error) {
        console.error("Error validating school code:", error);
        return {
          isValid: false,
          error: "Error validating school code"
        };
      }

      if (!data) {
        return {
          isValid: false,
          error: "Invalid school code. Please check and try again."
        };
      }

      // Check if code has expired
      if (data.code_expires_at) {
        const expiresAt = new Date(data.code_expires_at);
        if (expiresAt < new Date()) {
          return {
            isValid: false,
            error: "This school code has expired. Please contact your school administrator for a new code."
          };
        }
      }

      return {
        isValid: true,
        schoolId: data.id,
        schoolName: data.name
      };

    } catch (error) {
      console.error("Exception while validating school code:", error);
      return {
        isValid: false,
        error: "An unexpected error occurred while validating the school code"
      };
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Reset error state when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  return {
    generateCode,
    validateCode,
    isGenerating,
    isValidating,
    error
  };
}
