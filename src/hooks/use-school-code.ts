
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { asId, safeCast, hasData } from '@/utils/supabaseTypeHelpers';
import type { Database } from "@/integrations/supabase/types";

/**
 * Key for storing school codes in localStorage
 */
const SCHOOL_CODE_HISTORY_KEY = 'school_code_history';
const CURRENT_CODE_PREFIX = 'school_code_';

/**
 * Get stored code history from localStorage
 */
const getStoredCodeHistory = (schoolId: string): string[] => {
  try {
    // Get history for this particular school
    const historyKey = `${SCHOOL_CODE_HISTORY_KEY}_${schoolId}`;
    const storedHistory = localStorage.getItem(historyKey);
    return storedHistory ? JSON.parse(storedHistory) : [];
  } catch (error) {
    console.error("Error retrieving code history:", error);
    return [];
  }
};

/**
 * Store code history in localStorage
 */
const storeCodeHistory = (schoolId: string, codes: string[]) => {
  try {
    // Store history for this particular school
    const historyKey = `${SCHOOL_CODE_HISTORY_KEY}_${schoolId}`;
    localStorage.setItem(historyKey, JSON.stringify(codes));
  } catch (error) {
    console.error("Error storing code history:", error);
  }
};

/**
 * Add a code to the history
 */
const addCodeToHistory = (schoolId: string, code: string) => {
  try {
    // Get current history
    const currentHistory = getStoredCodeHistory(schoolId);
    
    // Only add if it's not already there
    if (!currentHistory.includes(code)) {
      // Add code to beginning of array (most recent first)
      const updatedHistory = [code, ...currentHistory].slice(0, 10); // Keep last 10 codes
      storeCodeHistory(schoolId, updatedHistory);
    }
  } catch (error) {
    console.error("Error adding code to history:", error);
  }
};

/**
 * Custom hook for generating and managing school invitation codes
 */
export const useSchoolCode = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedCode, setLastGeneratedCode] = useState<string | null>(null);
  const [codeHistory, setCodeHistory] = useState<string[]>([]);

  /**
   * Fetch the current school code
   */
  const fetchCurrentCode = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!schoolId || schoolId === 'demo-school-id') {
      return 'DEMO-CODE';
    }

    try {
      // Try to get code from localStorage first for instant loading
      const cachedCode = localStorage.getItem(`${CURRENT_CODE_PREFIX}${schoolId}`);
      if (cachedCode) return cachedCode;
      
      // If in production, try to fetch from database
      if (process.env.NODE_ENV === 'production') {
        const { data: schoolData, error } = await supabase
          .from("schools")
          .select("code")
          .eq("id", schoolId)
          .single();
          
        if (!error && schoolData) {
          const schoolCode = schoolData.code;
          if (schoolCode) {
            localStorage.setItem(`${CURRENT_CODE_PREFIX}${schoolId}`, schoolCode);
            // Add to history
            addCodeToHistory(schoolId, schoolCode);
            return schoolCode;
          }
        }
      }
      
      // Generate a new instant code if none exists
      const newCode = `SCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      localStorage.setItem(`${CURRENT_CODE_PREFIX}${schoolId}`, newCode);
      // Add to history
      addCodeToHistory(schoolId, newCode);
      return newCode;
    } catch (error: any) {
      console.error("Exception fetching school code:", error);
      return 'DEMO-CODE';
    }
  }, []);

  /**
   * Generate a new school code
   */
  const generateCode = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!schoolId || schoolId === 'demo-school-id') {
      const demoCode = `DEMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setLastGeneratedCode(demoCode);
      localStorage.setItem(`${CURRENT_CODE_PREFIX}${schoolId}`, demoCode);
      // Add to history
      addCodeToHistory(schoolId, demoCode);
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
            localStorage.setItem(`${CURRENT_CODE_PREFIX}${schoolId}`, data.code);
            // Add to history
            addCodeToHistory(schoolId, data.code);
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
          // Create update with proper typing
          const updateData = { code: generatedCode };
          
          await supabase
            .from("schools")
            .update(updateData)
            .eq("id", schoolId);
            
          // Also update in school_codes table for proper tracking
          const schoolCodesData = { 
            code: generatedCode,
            school_name: localStorage.getItem('school_name') || 'Unknown School',
            school_id: schoolId,
            active: true
          };
          
          await supabase
            .from("school_codes")
            .insert(schoolCodesData)
            .select();
        }
      } catch (dbError) {
        console.error("Error updating code in database:", dbError);
      }
      
      // Store in localStorage for quick access
      localStorage.setItem(`${CURRENT_CODE_PREFIX}${schoolId}`, generatedCode);
      
      // Add to history
      addCodeToHistory(schoolId, generatedCode);
      
      setLastGeneratedCode(generatedCode);
      return generatedCode;
    } catch (error: any) {
      console.error("Error generating school code:", error);
      // Fallback code
      const fallbackCode = 'SCHOOL-' + Date.now().toString(36).toUpperCase();
      setLastGeneratedCode(fallbackCode);
      localStorage.setItem(`${CURRENT_CODE_PREFIX}${schoolId}`, fallbackCode);
      // Add to history
      addCodeToHistory(schoolId, fallbackCode);
      return fallbackCode;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  /**
   * Generate a student invitation code
   */
  const generateStudentInviteCode = useCallback(async (schoolId: string): Promise<string | null> => {
    if (!schoolId || schoolId === 'demo-school-id') {
      const demoStudentCode = `STU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setLastGeneratedCode(demoStudentCode);
      // Add to history
      addCodeToHistory(schoolId, demoStudentCode);
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
            // Add to history
            addCodeToHistory(schoolId, data.code);
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
      // Add to history
      addCodeToHistory(schoolId, generatedCode);
      setLastGeneratedCode(generatedCode);
      return generatedCode;
    } catch (error: any) {
      console.error("Error generating student invite code:", error);
      const fallbackCode = 'STUDENT-' + Date.now().toString(36).toUpperCase();
      // Add to history
      addCodeToHistory(schoolId, fallbackCode);
      setLastGeneratedCode(fallbackCode);
      return fallbackCode;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Load code history when called, not automatically
  const loadCodeHistory = useCallback((schoolId: string) => {
    if (!schoolId) return;
    const history = getStoredCodeHistory(schoolId);
    setCodeHistory(history);
  }, []);

  return {
    generateCode,
    fetchCurrentCode,
    generateStudentInviteCode,
    isGenerating,
    lastGeneratedCode,
    codeHistory,
    loadCodeHistory
  };
};
