
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AssessmentList from '@/components/teacher/AssessmentList';

const StudentAssessments: React.FC = () => {
  const { profile } = useAuth();
  const [assessments, setAssessments] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchAssessments = async () => {
    if (!profile?.school_id) {
      toast.error("No school associated with your account");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          teacher:teacher_id (full_name),
          submission:assessment_submissions(
            id,
            score,
            completed,
            submitted_at
          )
        `)
        .eq('school_id', profile.school_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to handle the nested submission
      const processedData = (data || []).map((assessment) => {
        // Find the student's submission for this assessment
        const userSubmission = assessment.submission?.find(
          (sub: any) => sub.student_id === profile.id
        );
        
        return {
          ...assessment,
          submission: userSubmission || null
        };
      });

      setAssessments(processedData || []);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast.error("Failed to load assessments");
    }
  };

  useEffect(() => {
    if (profile?.school_id) {
      fetchAssessments();
    }
  }, [profile?.school_id]);

  const handleTakeAssessment = (assessmentId: string) => {
    navigate(`/student/assessment/${assessmentId}`);
  };

  const handleViewResult = (assessmentId: string, submissionId: string) => {
    navigate(`/student/assessment/${assessmentId}/results/${submissionId}`);
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Assessments</h1>
        </div>

        <AssessmentList 
          assessments={assessments} 
          isStudent={true}
          studentView={true}
          onTakeAssessment={handleTakeAssessment}
          onViewResult={handleViewResult}
        />
      </div>
    </DashboardLayout>
  );
};

export default StudentAssessments;
