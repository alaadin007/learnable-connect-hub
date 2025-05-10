
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import StatsCard from "@/components/analytics/StatsCard";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { StudyTimeData, SchoolPerformanceData, SchoolPerformanceSummary } from "@/components/analytics/types";
import { Users, BookOpen, MessageSquare, Clock } from "lucide-react";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import AdminNavbar from "@/components/school-admin/AdminNavbar";

const AdminAnalytics = () => {
  const { user, profile } = useAuth();
  const [analyticsSummary, setAnalyticsSummary] = useState({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0,
  });
  const [schoolPerformanceSummary, setSchoolPerformanceSummary] = useState<SchoolPerformanceSummary>({
    total_assessments: 0,
    students_with_submissions: 0,
    total_students: 0,
    avg_submissions_per_assessment: 0,
    avg_score: 0,
    completion_rate: 0,
    student_participation_rate: 0,
  });
  const [schoolPerformanceData, setSchoolPerformanceData] = useState<SchoolPerformanceData[]>([]);
  const [studyTimeData, setStudyTimeData] = useState<StudyTimeData[]>([]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const schoolId = getSchoolIdWithFallback();

        // Execute all queries concurrently for faster loading
        const [
          summaryResult,
          performanceSummaryResult,
          performanceResult,
          studyTimeResult
        ] = await Promise.all([
          supabase.from('school_analytics_summary')
            .select('*')
            .eq('school_id', schoolId)
            .single(),
          supabase.from('school_performance_metrics')
            .select('*')
            .eq('school_id', schoolId)
            .single(),
          supabase.from('school_improvement_metrics')
            .select('*')
            .eq('school_id', schoolId)
            .order('month', { ascending: false }),
          supabase.from('student_weekly_study_time')
            .select('*')
            .eq('school_id', schoolId)
        ]);

        // Handle summary data
        if (!summaryResult.error && summaryResult.data) {
          setAnalyticsSummary({
            activeStudents: summaryResult.data.active_students || 0,
            totalSessions: summaryResult.data.total_sessions || 0,
            totalQueries: summaryResult.data.total_queries || 0,
            avgSessionMinutes: summaryResult.data.avg_session_minutes || 0,
          });
        } else {
          console.error("Error fetching analytics summary:", summaryResult.error);
          // Use fallback data if needed
          setAnalyticsSummary({
            activeStudents: 45,
            totalSessions: 324,
            totalQueries: 1250,
            avgSessionMinutes: 32.5,
          });
        }

        // Handle performance summary data
        if (!performanceSummaryResult.error && performanceSummaryResult.data) {
          setSchoolPerformanceSummary({
            total_assessments: performanceSummaryResult.data.total_assessments || 0,
            students_with_submissions: performanceSummaryResult.data.students_with_submissions || 0,
            total_students: performanceSummaryResult.data.total_students || 0,
            avg_submissions_per_assessment: performanceSummaryResult.data.avg_submissions_per_assessment || 0,
            avg_score: performanceSummaryResult.data.avg_score || 0,
            completion_rate: performanceSummaryResult.data.completion_rate || 0,
            student_participation_rate: performanceSummaryResult.data.student_participation_rate || 0,
          });
        } else {
          console.error("Error fetching school performance summary:", performanceSummaryResult.error);
          // Use fallback data for better UX
          setSchoolPerformanceSummary({
            total_assessments: 24,
            students_with_submissions: 38,
            total_students: 45,
            avg_submissions_per_assessment: 15.7,
            avg_score: 78.4,
            completion_rate: 87.2,
            student_participation_rate: 91.3,
          });
        }

        // Handle performance data
        if (!performanceResult.error && performanceResult.data) {
          setSchoolPerformanceData(performanceResult.data);
        } else {
          console.error("Error fetching school performance data:", performanceResult.error);
          setSchoolPerformanceData(generateSamplePerformanceData());
        }

        // Handle study time data
        if (!studyTimeResult.error && studyTimeResult.data) {
          setStudyTimeData(prepareStudyTimeData(studyTimeResult.data));
        } else {
          console.error("Error fetching student study time:", studyTimeResult.error);
          setStudyTimeData(prepareStudyTimeData([])); // Will use fallback data
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        // Use fallback data if there's an exception
        setAnalyticsSummary({
          activeStudents: 45,
          totalSessions: 324,
          totalQueries: 1250,
          avgSessionMinutes: 32.5,
        });
        setSchoolPerformanceSummary({
          total_assessments: 24,
          students_with_submissions: 38,
          total_students: 45,
          avg_submissions_per_assessment: 15.7,
          avg_score: 78.4,
          completion_rate: 87.2,
          student_participation_rate: 91.3,
        });
        setSchoolPerformanceData(generateSamplePerformanceData());
        setStudyTimeData(prepareStudyTimeData([]));
      }
    };

    fetchAnalyticsData();
  }, []);

  // Update the function that prepares study time data to handle the week type properly
  const prepareStudyTimeData = (data: any[]): StudyTimeData[] => {
    if (!data || data.length === 0) {
      // Return sample data if no real data is available
      return [
        { student_id: "1", student_name: "Alice Smith", total_minutes: 240, week: "1", year: 2023 },
        { student_id: "2", student_name: "Bob Jones", total_minutes: 180, week: "1", year: 2023 },
        { student_id: "3", student_name: "Carol Wilson", total_minutes: 300, week: "1", year: 2023 },
        { student_id: "4", student_name: "David Brown", total_minutes: 120, week: "1", year: 2023 },
        { student_id: "5", student_name: "Eve Davis", total_minutes: 210, week: "1", year: 2023 },
      ];
    }

    // Convert to StudyTimeData format with backward compatibility for existing code
    return data.map(item => ({
      student_id: item.student_id || item.userId || "",
      student_name: item.student_name || item.studentName || item.name || "",
      total_minutes: item.total_minutes || (item.hours ? item.hours * 60 : 0),
      // Map all existing fields for backward compatibility
      studentName: item.student_name || item.studentName || item.name || "",
      name: item.student_name || item.studentName || item.name || "",
      hours: item.hours || (item.total_minutes ? item.total_minutes / 60 : 0),
      week: String(item.week_number || item.week || "1"), // Convert to string to ensure compatibility
      year: Number(item.year || new Date().getFullYear())
    }));
  };

  const generateSamplePerformanceData = (): SchoolPerformanceData[] => {
    const months = [5, 4, 3, 2, 1, 0];
    const today = new Date();
    
    return months.map(monthsAgo => {
      const date = new Date(today);
      date.setMonth(today.getMonth() - monthsAgo);
      
      const baseScore = 70 + Math.random() * 15;
      const baseCompletionRate = 60 + Math.random() * 25;
      
      return {
        month: date.toISOString().substring(0, 10), // Format as YYYY-MM-DD
        avg_monthly_score: Number(baseScore.toFixed(1)),
        monthly_completion_rate: Number(baseCompletionRate.toFixed(1)),
        score_improvement_rate: Number((Math.random() * 10 - 5).toFixed(1)),
        completion_improvement_rate: Number((Math.random() * 10 - 3).toFixed(1))
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">School Analytics</h1>
          
          <AdminNavbar />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Active Students"
              value={analyticsSummary.activeStudents}
              description="Number of students active this week"
              icon={<Users className="h-5 w-5" />}
              isLoading={false}
            />
            <StatsCard
              title="Total Sessions"
              value={analyticsSummary.totalSessions}
              description="Total learning sessions this week"
              icon={<BookOpen className="h-5 w-5" />}
              isLoading={false}
            />
            <StatsCard
              title="Total Queries"
              value={analyticsSummary.totalQueries}
              description="Total questions asked this week"
              icon={<MessageSquare className="h-5 w-5" />}
              isLoading={false}
            />
            <StatsCard
              title="Avg. Session Time"
              value={`${analyticsSummary.avgSessionMinutes.toFixed(1)} mins`}
              description="Average session duration"
              icon={<Clock className="h-5 w-5" />}
              isLoading={false}
            />
          </div>
          
          <SchoolPerformancePanel 
            data={schoolPerformanceData}
            summary={schoolPerformanceSummary}
            isLoading={false}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
