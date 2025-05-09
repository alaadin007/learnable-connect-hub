
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Custom hook for generating and managing school invitation codes
 */
export const useSchoolCode = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string | null>(null);

  /**
   * Fetch the current school code
   */
  const fetchCurrentCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId || schoolId === 'demo-school-id') {
      return 'DEMO-CODE';
    }

    try {
      // Try to get code from localStorage first for instant loading
      const cachedCode = localStorage.getItem(`school_code_${schoolId}`);
      if (cachedCode) return cachedCode;
      
      // If in production, try to fetch from database
      if (process.env.NODE_ENV === 'production') {
        const { data: schoolData, error } = await supabase
          .from("schools")
          .select("code")
          .eq("id", schoolId)
          .single();
          
        if (!error && schoolData) {
          localStorage.setItem(`school_code_${schoolId}`, schoolData.code);
          return schoolData.code;
        }
      }
      
      // Generate a new instant code if none exists
      const newCode = `SCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem(`school_code_${schoolId}`, newCode);
      return newCode;
    } catch (error: any) {
      console.error("Exception fetching school code:", error);
      return 'DEMO-CODE';
    }
  };

  /**
   * Generate a new school code
   */
  const generateCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId || schoolId === 'demo-school-id') {
      const demoCode = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setLastGeneratedCode(demoCode);
      localStorage.setItem(`school_code_${schoolId}`, demoCode);
      return demoCode;
    }

    setIsGenerating(true);
    
    try {
      if (process.env.NODE_ENV === 'production') {
        // Try to generate via edge function
        try {
          const { data, error } = await supabase.functions.invoke("generate-school-code", {
            body: { school_id: schoolId }
          });
          
          if (error) throw error;
          if (data && data.code) {
            localStorage.setItem(`school_code_${schoolId}`, data.code);
            setLastGeneratedCode(data.code);
            return data.code;
          }
        } catch (apiError) {
          console.error("API error generating code:", apiError);
          // Fall back to local generation
        }
      }
      
      // Generate code locally as fallback
      const generatedCode = `SCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Try to update in database
      try {
        if (process.env.NODE_ENV === 'production') {
          await supabase
            .from("schools")
            .update({ code: generatedCode })
            .eq("id", schoolId);
        }
      } catch (dbError) {
        console.error("Error updating code in database:", dbError);
      }
      
      // Store in localStorage for quick access
      localStorage.setItem(`school_code_${schoolId}`, generatedCode);
      
      setLastGeneratedCode(generatedCode);
      return generatedCode;
    } catch (error: any) {
      console.error("Error generating school code:", error);
      // Fallback code
      const fallbackCode = 'SCHOOL-' + Date.now().toString(36).toUpperCase();
      setLastGeneratedCode(fallbackCode);
      localStorage.setItem(`school_code_${schoolId}`, fallbackCode);
      return fallbackCode;
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Generate a student invitation code
   */
  const generateStudentInviteCode = async (schoolId: string): Promise<string | null> => {
    if (!schoolId || schoolId === 'demo-school-id') {
      const demoStudentCode = `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setLastGeneratedCode(demoStudentCode);
      return demoStudentCode;
    }

    setIsGenerating(true);
    
    try {
      if (process.env.NODE_ENV === 'production') {
        // Try to generate via edge function
        try {
          const { data, error } = await supabase.functions.invoke("generate-student-invite", {
            body: { school_id: schoolId }
          });
          
          if (error) throw error;
          if (data && data.code) {
            setLastGeneratedCode(data.code);
            return data.code;
          }
        } catch (apiError) {
          console.error("API error generating student code:", apiError);
          // Fall back to local generation
        }
      }
      
      // Generate student code locally as fallback
      const generatedCode = `STU${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setLastGeneratedCode(generatedCode);
      return generatedCode;
    } catch (error: any) {
      console.error("Error generating student invite code:", error);
      const fallbackCode = 'STUDENT-' + Date.now().toString(36).toUpperCase();
      setLastGeneratedCode(fallbackCode);
      return fallbackCode;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateCode,
    fetchCurrentCode,
    generateStudentInviteCode,
    isGenerating,
    lastGeneratedCode
  };
};
