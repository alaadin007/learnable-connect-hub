
import { useState } from "react";
import { supabase, verifySchoolCode } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { asId } from "@/utils/supabaseTypeHelpers";

// Define proper return types for better type safety
export interface SchoolCodeVerificationResult {
  valid: boolean; 
  schoolId?: string; 
  schoolName?: string;
}

export interface CodeHistoryItem {
  code: string;
  generated_at: string;
}

export interface UseSchoolCodeResult {
  verifyCode: (code: string) => Promise<SchoolCodeVerificationResult>;
  loading: boolean;
  error: string | null;
  generateCode: () => Promise<string | null>;
  isGenerating: boolean;
  codeHistory: CodeHistoryItem[];
  loadCodeHistory: () => Promise<void>;
  generateStudentInviteCode: () => Promise<string | null>;
}

export function useSchoolCode(): UseSchoolCodeResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [codeHistory, setCodeHistory] = useState<CodeHistoryItem[]>([]);

  const verifyCode = async (code: string): Promise<SchoolCodeVerificationResult> => {
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

  // Implement proper generateCode function for SchoolCodeGenerator compatibility
  const generateCode = async (): Promise<string | null> => {
    setIsGenerating(true);
    try {
      // API call to generate a new school code
      const { data, error } = await supabase.rpc('generate_new_school_code');
      
      if (error) {
        throw error;
      }
      
      if (data) {
        toast.success("New school code generated successfully");
        return data;
      }
      
      return null;
    } catch (err: any) {
      toast.error("Failed to generate school code", {
        description: err.message
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Implement loadCodeHistory function for SchoolCodeManager compatibility
  const loadCodeHistory = async (): Promise<void> => {
    try {
      setLoading(true);
      // Get current school ID
      const { data: schoolInfo, error: schoolError } = await supabase.rpc('get_current_school_info');
      
      if (schoolError || !schoolInfo || schoolInfo.length === 0) {
        throw new Error("Failed to get school info");
      }
      
      const schoolId = schoolInfo[0].school_id;
      
      // Get code history
      const { data, error } = await supabase
        .from('school_code_logs')
        .select('*')
        .eq('school_id', schoolId)
        .order('generated_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setCodeHistory(data || []);
    } catch (err: any) {
      console.error("Error loading code history:", err);
      toast.error("Failed to load code history");
    } finally {
      setLoading(false);
    }
  };

  // Implement generateStudentInviteCode for compatibility 
  const generateStudentInviteCode = async (): Promise<string | null> => {
    try {
      setIsGenerating(true);
      // Get current school ID
      const { data: schoolInfo, error: schoolError } = await supabase.rpc('get_current_school_info');
      
      if (schoolError || !schoolInfo || schoolInfo.length === 0) {
        throw new Error("Failed to get school info");
      }
      
      const schoolId = schoolInfo[0].school_id;
      
      // Generate student invite code
      const { data, error } = await supabase.rpc('create_student_invitation', {
        school_id_param: schoolId
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        return data[0].code;
      }
      
      return null;
    } catch (err: any) {
      toast.error("Failed to generate student invite code", {
        description: err.message
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
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
