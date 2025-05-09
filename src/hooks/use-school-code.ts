
import { useState } from 'react';
import { toast } from 'sonner';

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
      return demoCode;
    }

    setIsGenerating(true);
    
    try {
      // Generate code locally to avoid API calls
      const generatedCode = `SCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Store in localStorage for quick access next time
      localStorage.setItem(`school_code_${schoolId}`, generatedCode);
      
      setLastGeneratedCode(generatedCode);
      return generatedCode;
    } catch (error: any) {
      console.error("Error generating school code:", error);
      // Fallback code
      const fallbackCode = 'SCHOOL-' + Date.now().toString(36).toUpperCase();
      setLastGeneratedCode(fallbackCode);
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
      // Generate student code locally to avoid API errors
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
