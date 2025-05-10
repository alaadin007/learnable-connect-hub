
import { useState } from "react";
import { supabase, verifySchoolCode } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { asId } from "@/utils/supabaseTypeHelpers";

interface UseSchoolCodeResult {
  verifyCode: (code: string) => Promise<{ 
    valid: boolean; 
    schoolId?: string; 
    schoolName?: string;
  }>;
  loading: boolean;
  error: string | null;
}

export function useSchoolCode(): UseSchoolCodeResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const verifyCode = async (code: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the verifySchoolCode function from client.ts
      const result = await verifySchoolCode(code);
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to verify school code";
      setError(errorMessage);
      toast.error("School code verification failed", {
        description: errorMessage
      });
      
      return { valid: false };
    } finally {
      setLoading(false);
    }
  };

  return { verifyCode, loading, error };
}

export default useSchoolCode;
