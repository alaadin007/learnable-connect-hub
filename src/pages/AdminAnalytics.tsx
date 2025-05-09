
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { AnalyticsSummaryCards } from "@/components/analytics/AnalyticsSummaryCards";
import { SchoolPerformancePanel } from "@/components/analytics/SchoolPerformancePanel";
import { TeacherPerformanceTable } from "@/components/analytics/TeacherPerformanceTable";
import { StudentPerformanceTable } from "@/components/analytics/StudentPerformanceTable";
import TopicsChart from "@/components/analytics/TopicsChart";
import StudyTimeChart from "@/components/analytics/StudyTimeChart";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types matching expected component props
import type {
  SchoolPerformanceData,
  SchoolPerformanceSummary,
  TeacherPerformanceData,
  StudentPerformanceData,
  TopicData,
  StudyTimeData,
  AnalyticsSummary
} from "@/components/analytics/types";

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const [selectedDateRange, setSelectedDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // State for real data
  const [schoolPerformanceData, setSchoolPerformanceData] = useState<SchoolPerformanceData[]>([]);
  const [schoolSummary, setSchoolSummary] = useState<SchoolPerformanceSummary>({
    total_assessments: 0,
    students_with_submissions: 0,
    total_students: 0,
    avg_submissions_per_assessment: 0,
    avg_score: 0,
    completion_rate: 0,
    student_participation_rate: 0
  });
  
  const [teacherPerformanceData, setTeacherPerformanceData] = useState<TeacherPerformanceData[]>([]);
  const [studentPerformanceData, setStudentPerformanceData] = useState<StudentPerformanceData[]>([]);
  const [topicsData, setTopicsData] = useState<TopicData[]>([]);
  const [studyTimeData, setStudyTimeData] = useState<StudyTimeData[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });

  // Fetch data from database
  useEffect(() => {
    loadAnalyticsData();
  }, [selectedDateRange]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const schoolId = getSchoolIdWithFallback();
      
      // Fetch school performance data
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('get_school_improvement_metrics', { p_school_id: schoolId });
      
      if (performanceError) {
        console.error("Error fetching school performance:", performanceError);
      } else if (performanceData) {
        setSchoolPerformanceData(performanceData);
      }
      
      // Fetch school summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_school_performance_metrics', { p_school_id: schoolId });
        
      if (summaryError) {
        console.error("Error fetching school summary:", summaryError);
      } else if (summaryData && summaryData.length > 0) {
        setSchoolSummary(summaryData[0]);
      }
      
      // Fetch teacher performance data
      const { data: teacherData, error: teacherError } = await supabase
        .rpc('get_teacher_performance_metrics', { p_school_id: schoolId });
        
      if (teacherError) {
        console.error("Error fetching teacher performance:", teacherError);
      } else if (teacherData) {
        setTeacherPerformanceData(teacherData);
      }
      
      // Fetch student performance data
      const { data: studentData, error: studentError } = await supabase
        .rpc('get_student_performance_metrics', { p_school_id: schoolId });
        
      if (studentError) {
        console.error("Error fetching student performance:", studentError);
      } else if (studentData) {
        setStudentPerformanceData(studentData);
      }
      
      // Fetch topics data
      const { data: topicsResult, error: topicsError } = await supabase
        .from('most_studied_topics')
        .select('*')
        .eq('school_id', schoolId)
        .order('count_of_sessions', { ascending: false })
        .limit(10);
        
      if (topicsError) {
        console.error("Error fetching topics:", topicsError);
      } else if (topicsResult) {
        // Transform to expected format
        const transformedTopics: TopicData[] = topicsResult.map(item => ({
          name: item.topic_or_content_used || 'Unknown',
          count: item.count_of_sessions || 0,
          topic: item.topic_or_content_used || 'Unknown',
          value: item.count_of_sessions || 0
        }));
        setTopicsData(transformedTopics);
      }
      
      // Fetch study time data
      const { data: studyTimeResult, error: studyTimeError } = await supabase
        .from('student_weekly_study_time')
        .select('*')
        .eq('school_id', schoolId);
        
      if (studyTimeError) {
        console.error("Error fetching study time:", studyTimeError);
      } else if (studyTimeResult) {
        // Transform to expected format
        const transformedStudyTime: StudyTimeData[] = studyTimeResult.map(item => ({
          week: `Week ${item.week_number || 1}`,
          hours: Number(item.study_hours) || 0,
          student_name: item.student_name,
          studentName: item.student_name,
          name: item.student_name || 'Unknown',
          total_minutes: (Number(item.study_hours) || 0) * 60
        }));
        setStudyTimeData(transformedStudyTime);
      }
      
      // Fetch analytics summary
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('school_analytics_summary')
        .select('*')
        .eq('school_id', schoolId)
        .single();
        
      if (analyticsError) {
        console.error("Error fetching analytics summary:", analyticsError);
      } else if (analyticsData) {
        setAnalyticsSummary({
          activeStudents: analyticsData.active_students || 0,
          totalSessions: analyticsData.total_sessions || 0,
          totalQueries: analyticsData.total_queries || 0,
          avgSessionMinutes: analyticsData.avg_session_minutes || 0
        });
      }
      
      // If no data is returned from API, use fallback values
      if (!performanceData?.length && !summaryData?.length) {
        fetchFallbackData(schoolId);
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      toast.error("Could not load analytics data");
      fetchFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch fallback data if API calls fail
  const fetchFallbackData = async (schoolId?: string) => {
    console.info("Using fallback data generation for analytics");
    
    // Generate minimal fallback data if no real data is available
    setAnalyticsSummary({
      activeStudents: 10,
      totalSessions: 25,
      totalQueries: 150,
      avgSessionMinutes: 22
    });
    
    if (topicsData.length === 0) {
      setTopicsData([
        { name: "Mathematics", topic: "Mathematics", count: 45, value: 45 },
        { name: "Science", topic: "Science", count: 38, value: 38 },
        { name: "English", topic: "English", count: 32, value: 32 },
        { name: "History", topic: "History", count: 28, value: 28 },
        { name: "Art", topic: "Art", count: 15, value: 15 }
      ]);
    }
    
    if (studyTimeData.length === 0) {
      setStudyTimeData([
        { week: "Week 1", hours: 10.5, student_name: "Student Group", studentName: "Student Group", name: "Student Group", total_minutes: 630 },
        { week: "Week 2", hours: 12.2, student_name: "Student Group", studentName: "Student Group", name: "Student Group", total_minutes: 732 },
        { week: "Week 3", hours: 9.8, student_name: "Student Group", studentName: "Student Group", name: "Student Group", total_minutes: 588 },
        { week: "Week 4", hours: 14.1, student_name: "Student Group", studentName: "Student Group", name: "Student Group", total_minutes: 846 },
        { week: "Week 5", hours: 11.6, student_name: "Student Group", studentName: "Student Group", name: "Student Group", total_minutes: 696 }
      ]);
    }
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setSelectedDateRange(range);
  };

  // Export analytics data
  const handleExportData = async () => {
    try {
      const schoolId = getSchoolIdWithFallback();
      const fileName = `school_analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Build CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "School Analytics Export\n\n";
      
      // Add summary section
      csvContent += "SUMMARY\n";
      csvContent += `Active Students,${analyticsSummary.activeStudents}\n`;
      csvContent += `Total Sessions,${analyticsSummary.totalSessions}\n`;
      csvContent += `Total Queries,${analyticsSummary.totalQueries}\n`;
      csvContent += `Average Session Minutes,${analyticsSummary.avgSessionMinutes}\n\n`;
      
      // Add topics section
      csvContent += "TOPICS,COUNT\n";
      topicsData.forEach(topic => {
        csvContent += `${topic.name},${topic.count}\n`;
      });
      csvContent += "\n";
      
      // Add student time section
      csvContent += "STUDY TIME\n";
      csvContent += "WEEK,HOURS\n";
      studyTimeData.forEach(item => {
        csvContent += `${item.week},${item.hours}\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Analytics data exported successfully");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export analytics data");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => navigate('/admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">School Analytics</h1>
          </div>

          <AdminNavbar className="mb-8" />

          {/* Filters and Export */}
          <div className="mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <AnalyticsFilters 
                    dateRange={selectedDateRange}
                    onDateRangeChange={handleDateRangeChange}
                  />
                  <Button 
                    onClick={handleExportData}
                    className="self-start"
                  >
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          <div className="mb-8">
            <AnalyticsSummaryCards 
              summary={analyticsSummary}
              isLoading={isLoading}
            />
          </div>

          {/* School Performance */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>School Performance</CardTitle>
                <CardDescription>Track your school's performance metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolPerformancePanel 
                  performanceData={schoolPerformanceData}
                  summary={schoolSummary}
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>

          {/* Teacher Performance */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Teacher Performance</CardTitle>
                <CardDescription>Compare performance metrics across teachers</CardDescription>
              </CardHeader>
              <CardContent>
                <TeacherPerformanceTable 
                  data={teacherPerformanceData} 
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </div>

          {/* Student Performance */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance</CardTitle>
                <CardDescription>See detailed performance for each student</CardDescription>
              </CardHeader>
              <CardContent>
                <StudentPerformanceTable 
                  data={studentPerformanceData} 
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Topics Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Most Studied Topics</CardTitle>
                <CardDescription>Popular topics among students</CardDescription>
              </CardHeader>
              <CardContent>
                <TopicsChart data={topicsData} isLoading={isLoading} />
              </CardContent>
            </Card>

            {/* Study Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Study Time</CardTitle>
                <CardDescription>Average hours spent studying per week</CardDescription>
              </CardHeader>
              <CardContent>
                <StudyTimeChart data={studyTimeData} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminAnalytics;
