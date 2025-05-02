import React, { useState, useEffect } from "react";
import { format, subDays, getWeek } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DateRangePicker } from "./DateRangePicker";
import { StudentSelector } from "./StudentSelector";
import { TeacherSelector } from "./TeacherSelector";
import StudyTimeChart from "./StudyTimeChart";
import TopicsChart from "./TopicsChart";
import SessionsTable from "./SessionsTable";
import StatsCard from "./StatsCard";
import { Users, BarChart2, MessageSquare, Book } from "lucide-react";
import { 
  Student, 
  SessionData, 
  AnalyticsSummary, 
  DateRange, 
  TopicData, 
  StudyTimeData,
  SchoolPerformanceData,
  SchoolPerformanceSummary,
  TeacherPerformanceData,
  StudentPerformanceData
} from "./types";
import { toast } from "@/hooks/use-toast";
import { SchoolPerformancePanel } from "./SchoolPerformancePanel";
import { TeacherPerformanceTable } from "./TeacherPerformanceTable";
import { StudentPerformanceTable } from "./StudentPerformanceTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchSchoolPerformance,
  fetchTeacherPerformance,
  fetchStudentPerformance
} from "@/utils/analyticsUtils";

interface AnalyticsDashboardProps {
  userRole: "school" | "teacher";
  isLoading?: boolean;
}

const AnalyticsDashboard = ({ userRole, isLoading: externalLoading }: AnalyticsDashboardProps) => {
  const { schoolId } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(externalLoading || true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>(undefined);
  
  // Engagement metrics state
  const [studyTimeData, setStudyTimeData] = useState<StudyTimeData[]>([]);
  const [topicsData, setTopicsData] = useState<TopicData[]>([]);
  const [sessionsData, setSessionsData] = useState<SessionData[]>([]);
  const [stats, setStats] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });

  // Performance metrics state
  const [schoolPerformanceData, setSchoolPerformanceData] = useState<SchoolPerformanceData[]>([]);
  const [schoolPerformanceSummary, setSchoolPerformanceSummary] = useState<SchoolPerformanceSummary | null>(null);
  const [teacherPerformanceData, setTeacherPerformanceData] = useState<TeacherPerformanceData[]>([]);
  const [studentPerformanceData, setStudentPerformanceData] = useState<StudentPerformanceData[]>([]);

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("engagement");

  // Fetch students for the selector
  useEffect(() => {
    const fetchStudents = async () => {
      if (!schoolId) return;
      
      try {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('user_type', 'student')
          .order('full_name');
          
        if (error) throw error;
        
        const formattedStudents = profilesData.map(profile => ({
          id: profile.id,
          name: profile.full_name || 'Unknown Student'
        }));
        
        setStudents(formattedStudents);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "Could not fetch students. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchStudents();
  }, [schoolId]);

  // Fetch analytics data based on filters
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!schoolId) return;
      setIsLoading(true);
      
      try {
        // 1. Fetch study time data
        const studyTimeQuery = supabase
          .from('student_weekly_study_time')
          .select('user_id, student_name, week_number, year, study_hours')
          .eq('school_id', schoolId);
          
        if (selectedStudent) {
          studyTimeQuery.eq('user_id', selectedStudent.id);
        }
        
        const { data: studyData, error: studyError } = await studyTimeQuery;
        
        if (studyError) throw studyError;
        
        const formattedStudyData: StudyTimeData[] = studyData?.map(item => ({
          student_name: item.student_name || 'Unknown',
          student_id: item.user_id || '',
          total_minutes: Number(item.study_hours || 0) * 60,
          // For backward compatibility
          studentName: item.student_name || 'Unknown',
          name: item.student_name || 'Unknown',
          hours: Number(item.study_hours || 0),
          week: Number(item.week_number) || 0,
          year: Number(item.year) || new Date().getFullYear()
        })) || [];
        
        setStudyTimeData(formattedStudyData);
        
        // 2. Fetch topics data
        const topicsQuery = supabase
          .from('most_studied_topics')
          .select('topic_or_content_used, count_of_sessions')
          .eq('school_id', schoolId)
          .order('count_of_sessions', { ascending: false })
          .limit(6);
          
        const { data: topicsData, error: topicsError } = await topicsQuery;
        
        if (topicsError) throw topicsError;
        
        const formattedTopicsData: TopicData[] = topicsData?.map(item => ({
          topic: item.topic_or_content_used || 'General',
          count: Number(item.count_of_sessions) || 0,
          // For backward compatibility
          name: item.topic_or_content_used || 'General',
          value: Number(item.count_of_sessions) || 0
        })) || [];
        
        setTopicsData(formattedTopicsData);
        
        // 3. Fetch session logs
        let dateFrom = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
        let dateTo = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;
        
        // First, get the session logs
        const sessionsQuery = supabase
          .from('session_logs')
          .select(`
            id, 
            user_id,
            topic_or_content_used,
            num_queries,
            session_start,
            session_end
          `)
          .eq('school_id', schoolId)
          .order('session_start', { ascending: false })
          .limit(10);
          
        if (dateFrom) {
          sessionsQuery.gte('session_start', dateFrom);
        }
        
        if (dateTo) {
          sessionsQuery.lte('session_start', dateTo);
        }
        
        if (selectedStudent) {
          sessionsQuery.eq('user_id', selectedStudent.id);
        }
        
        const { data: sessionsData, error: sessionsError } = await sessionsQuery;
        
        if (sessionsError) throw sessionsError;
        
        // Now get the profiles for these sessions separately
        const userIds = sessionsData?.map(session => session.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
          
        if (profilesError) throw profilesError;
        
        // Create a map of user IDs to names for easy lookup
        const userNameMap: Record<string, string> = {};
        profilesData?.forEach(profile => {
          userNameMap[profile.id] = profile.full_name || 'Unknown';
        });
        
        const formattedSessionsData: SessionData[] = sessionsData?.map(session => {
          // Calculate session duration
          let duration = "N/A";
          let durationMinutes = 0;
          if (session.session_end && session.session_start) {
            const startTime = new Date(session.session_start);
            const endTime = new Date(session.session_end);
            const durationMs = endTime.getTime() - startTime.getTime();
            durationMinutes = Math.round(durationMs / (1000 * 60));
            duration = `${durationMinutes} min`;
          }
          
          const sessionDate = format(new Date(session.session_start), 'MMM dd, yyyy');
          
          return {
            id: session.id,
            student_name: userNameMap[session.user_id] || "Unknown",
            student_id: session.user_id,
            session_date: sessionDate,
            duration_minutes: durationMinutes,
            topics: [session.topic_or_content_used || "General"],
            questions_asked: session.num_queries || 0,
            questions_answered: session.num_queries || 0,
            
            // Backward compatibility properties
            userId: session.user_id,
            userName: userNameMap[session.user_id] || "Unknown",
            topicOrContent: session.topic_or_content_used || "General",
            startTime: sessionDate,
            endTime: session.session_end,
            duration: duration,
            numQueries: session.num_queries,
            student: userNameMap[session.user_id] || "Unknown",
            topic: session.topic_or_content_used || "General",
            queries: session.num_queries
          };
        }) || [];
        
        setSessionsData(formattedSessionsData);
        
        // 4. Fetch summary statistics
        const { data: statsData, error: statsError } = await supabase
          .from('school_analytics_summary')
          .select('*')
          .eq('school_id', schoolId)
          .single();
          
        if (statsError && statsError.code !== 'PGRST116') {
          throw statsError;
        }
        
        if (statsData) {
          setStats({
            activeStudents: statsData.active_students || 0,
            totalSessions: statsData.total_sessions || 0,
            totalQueries: statsData.total_queries || 0,
            avgSessionMinutes: Math.round(Number(statsData.avg_session_minutes) || 0)
          });
        }

        // 5. Fetch performance data if on performance tab
        if (activeTab === "performance") {
          // Fetch school performance data
          const performanceFilters = {
            dateRange,
            studentId: selectedStudent?.id,
            teacherId: selectedTeacherId,
            schoolId: schoolId
          };
          
          const schoolPerformance = await fetchSchoolPerformance(schoolId, performanceFilters);
          
          // Use the data directly as it should now match the expected format
          if (schoolPerformance.monthlyData && Array.isArray(schoolPerformance.monthlyData)) {
            setSchoolPerformanceData(schoolPerformance.monthlyData);
          }
          
          if (schoolPerformance.summary) {
            setSchoolPerformanceSummary(schoolPerformance.summary);
          }
          
          // Fetch teacher performance data
          const teacherData = await fetchTeacherPerformance(schoolId, performanceFilters);
          
          // Use data directly as it should now match the expected format
          if (teacherData && Array.isArray(teacherData)) {
            setTeacherPerformanceData(teacherData);
          }
          
          // Fetch student performance data
          const studentData = await fetchStudentPerformance(schoolId, performanceFilters);
          
          // Use data directly as it should now match the expected format
          if (studentData && Array.isArray(studentData)) {
            setStudentPerformanceData(studentData);
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        toast({
          title: "Error",
          description: "Could not fetch analytics data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, [schoolId, dateRange, selectedStudent, selectedTeacherId, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Custom handler for date range changes to maintain correct typing
  const handleDateRangeChange = (newDateRange: DateRange | undefined) => {
    if (newDateRange) {
      setDateRange(newDateRange);
    } else {
      setDateRange({ from: undefined, to: undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
        </div>
        <div className="w-full md:w-1/2">
          <StudentSelector 
            students={students}
            selectedStudent={selectedStudent}
            onStudentSelect={setSelectedStudent}
          />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="engagement">Engagement Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatsCard
              title="Students"
              value={stats.activeStudents}
              description="Active students"
              icon={<Users className="h-5 w-5" />}
            />
            <StatsCard
              title="Sessions"
              value={stats.totalSessions}
              description="Total learning sessions"
              icon={<MessageSquare className="h-5 w-5" />}
            />
            <StatsCard
              title="Queries"
              value={stats.totalQueries}
              description="Total student queries"
              icon={<Book className="h-5 w-5" />}
            />
            <StatsCard
              title="Avg. Time"
              value={`${stats.avgSessionMinutes} min`}
              description="Average session length"
              icon={<BarChart2 className="h-5 w-5" />}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <StudyTimeChart 
              data={studyTimeData} 
              title="Weekly Study Time" 
              description={`Study hours per student ${selectedStudent ? 'for selected student' : ''}`}
              isLoading={isLoading}
            />
            <TopicsChart 
              data={topicsData}
              title="Most Studied Topics"
              description="Distribution of topics studied by students"
              isLoading={isLoading}
            />
          </div>
          
          <SessionsTable 
            sessions={sessionsData}
            title="Recent Learning Sessions"
            description="Latest student learning sessions"
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-6">
          {/* Add teacher selector for performance metrics */}
          <div className="w-full max-w-xs mb-6">
            <TeacherSelector
              schoolId={schoolId}
              selectedTeacherId={selectedTeacherId}
              onTeacherChange={setSelectedTeacherId}
            />
          </div>
          
          {/* School Performance Panel */}
          <SchoolPerformancePanel
            monthlyData={schoolPerformanceData}
            summary={schoolPerformanceSummary}
            isLoading={isLoading}
          />
          
          {/* Teacher Performance Table */}
          <TeacherPerformanceTable
            data={teacherPerformanceData}
            isLoading={isLoading}
          />
          
          {/* Student Performance Table */}
          <StudentPerformanceTable
            data={studentPerformanceData}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;
