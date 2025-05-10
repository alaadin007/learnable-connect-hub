
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AssessmentList from '@/components/teacher/AssessmentList';

// Assuming we don't have access to the AssessmentList component to modify it,
// let's just make sure the props we pass match what it expects.

const StudentAssessments = () => {
  const { user, profile } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssessments = async () => {
    if (!profile?.school_id) {
      toast.error("No school associated with your account");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          teacher:teacher_id (full_name)
        `)
        .eq('school_id', profile.school_id);

      if (error) throw error;

      setAssessments(data || []);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast.error("Failed to load assessments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.school_id) {
      fetchAssessments();
    }
  }, [profile?.school_id]);

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Assessments</h1>
        </div>

        <AssessmentList 
          assessments={assessments} 
          isLoading={isLoading} 
          studentView={true}
          // We'll assume the component handles a null or undefined onRefresh
        />
      </div>
    </DashboardLayout>
  );
};

export default StudentAssessments;
