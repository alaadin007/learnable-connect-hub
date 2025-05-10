
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Define the code history type
interface CodeHistoryItem {
  code: string;
  generated_at: string;
}

// Define return type for our hook
interface UseSchoolCodeResult {
  generateCode: () => Promise<string | null>;
  generateStudentInviteCode: () => Promise<string | null>;
  isGenerating: boolean;
  codeHistory: CodeHistoryItem[];
  loadCodeHistory: () => Promise<void>;
}

export const useSchoolCode = (): UseSchoolCodeResult => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeHistory, setCodeHistory] = useState<CodeHistoryItem[]>([]);
  const { profile } = useAuth();

  const loadCodeHistory = useCallback(async () => {
    if (!profile?.school_id) return;

    try {
      const { data, error } = await supabase
        .from('school_code_logs')
        .select('code, generated_at')
        .eq('school_id', profile.school_id)
        .order('generated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      if (data) {
        const historyItems: CodeHistoryItem[] = data.map(item => ({
          code: item.code,
          generated_at: item.generated_at
        }));
        
        setCodeHistory(historyItems);
      }
    } catch (err: any) {
      console.error('Failed to load code history:', err);
    }
  }, [profile]);

  const generateCode = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-school-code', {
        body: {}
      });

      if (error) throw error;

      const newCode: string = data?.code;
      
      if (newCode) {
        await loadCodeHistory();
        return newCode;
      }
      
      return null;
    } catch (err: any) {
      console.error('Error generating school code:', err);
      toast.error('Failed to generate code');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [loadCodeHistory]);
  
  const generateStudentInviteCode = useCallback(async (): Promise<string | null> => {
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-student-invite', {
        body: {}
      });

      if (error) throw error;

      const code: string = data?.code;
      
      if (code) {
        await loadCodeHistory();
        return code;
      }
      
      return null;
    } catch (err: any) {
      console.error('Error generating invite code:', err);
      toast.error('Failed to generate invite code');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [loadCodeHistory]);

  return {
    generateCode,
    generateStudentInviteCode,
    isGenerating,
    codeHistory,
    loadCodeHistory
  };
};

// Add a default export for those importing it as default
export default useSchoolCode;
