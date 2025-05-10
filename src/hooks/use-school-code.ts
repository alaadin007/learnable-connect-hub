
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
  // Adding missing properties used in SchoolCodeGenerator and Manager
  generateCode?: () => Promise<string | null>;
  isGenerating?: boolean;
  codeHistory?: any[];
  loadCodeHistory?: () => Promise<void>;
  generateStudentInviteCode?: () => Promise<string | null>;
}

export function useSchoolCode(): UseSchoolCodeResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [codeHistory, setCodeHistory] = useState<any[]>([]);

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

  const generateCode = async (): Promise<string | null> => {
    setIsGenerating(true);
    try {
      // Implementation would be here in a real context
      setIsGenerating(false);
      return "GENERATED_CODE";
    } catch (err) {
      setIsGenerating(false);
      return null;
    }
  };

  const loadCodeHistory = async (): Promise<void> => {
    // Mock implementation
    setCodeHistory([]);
  };

  const generateStudentInviteCode = async (): Promise<string | null> => {
    // Mock implementation
    return "STUDENT_CODE";
  };

  return { 
    verifyCode, 
    loading, 
    error,
    generateCode,
    isGenerating,
    codeHistory,
    loadCodeHistory,
    generateStudentInviteCode
  };
}

export default useSchoolCode;
