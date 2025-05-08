
import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StudyTimeChart from "@/components/analytics/StudyTimeChart";
import TopicsChart from "@/components/analytics/TopicsChart";
import SessionsTable from "@/components/analytics/SessionsTable";
import { SessionData, TopicData, StudyTimeData, DateRange, AnalyticsFilters, Student } from "@/components/analytics/types";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { StudentSelector } from "@/components/analytics/StudentSelector";
import AnalyticsSummaryCards from "@/components/analytics/AnalyticsSummaryCards";
import { fetchTeacherAnalytics, adaptTeacherAnalyticsData } from "@/utils/analyticsUtils";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DownloadCloud } from "lucide-react";
import { toast } from "sonner";
import AnalyticsExport from "@/components/analytics/AnalyticsExport";
import StudentPerformancePanel from "@/components/analytics/StudentPerformancePanel";

interface AnalyticsSummary {
  activeStudents: number;
  totalSessions: number;
  totalQueries: number;
  avgSessionMinutes: number;
}

const TeacherAnalytics: React.FC = () => {
  const { user, profile, schoolId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  
  // Analytics data
  const [summary, setSummary] = useState<AnalyticsSummary>({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0,
  });
  
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [studyTime, setStudyTime] = useState<StudyTimeData[]>([]);
  
  // Export functionality
  const [showExport, setShowExport] = useState(false);
  
  // Fetch teacher analytics data on component mount
  useEffect(() => {
    if (user && schoolId) {
      fetchAnalyticsData();
      fetchStudents();
    }
  }, [user, schoolId]);
  
  // Refetch when filters change
  useEffect(() => {
    if (user && schoolId) {
      fetchAnalyticsData();
    }
  }, [dateRange, selectedStudent?.id]);
  
  const fetchAnalyticsData = async () => {
    if (!user || !schoolId) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Normalize session data from the API format to our application format
      const filters: AnalyticsFilters = {
        dateRange,
        studentId: selectedStudent?.id,
        schoolId: schoolId
      };
      
      const analyticsData = await fetchTeacherAnalytics(filters);
      
      // Process the data for our components
      const adaptedData = adaptTeacherAnalyticsData(analyticsData);
      
      // Update state with fetched data
      setSummary({
        activeStudents: adaptedData.summary.activeStudents,
        totalSessions: adaptedData.summary.totalSessions,
        totalQueries: adaptedData.summary.totalQueries,
        avgSessionMinutes: adaptedData.summary.avgSessionMinutes
      });
      
      // Convert the sessions data to match our SessionData type
      const convertedSessions: SessionData[] = adaptedData.sessions.map(session => ({
        id: session.id,
        userId: session.student_id,
        userName: session.student_name,
        startTime: session.session_date,
        endTime: null,  // This might need to be calculated from duration
        duration: session.duration_minutes * 60, // Convert minutes to seconds
        topicOrContent: Array.isArray(session.topics) && session.topics.length > 0 
          ? session.topics.join(", ") 
          : session.topic || "General",
        numQueries: session.questions_asked || session.queries || 0,
        topic: session.topic || "",
        topics: session.topics,
        questions_asked: session.questions_asked,
        questions_answered: session.questions_answered,
        duration_minutes: session.duration_minutes,
        student_name: session.student_name
      }));
      
      setSessions(convertedSessions);
      setTopics(adaptedData.topics);
      setStudyTime(adaptedData.studyTime);
      
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      setError(error.message || "Failed to load analytics data");
      toast.error("Failed to load analytics data");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch list of students for the filter
  const fetchStudents = async () => {
    if (!schoolId) return;
    
    try {
      const { data, error } = await fetch(`/api/students?school_id=${schoolId}`)
        .then(res => res.json());
      
      if (error) throw new Error(error.message);
      
      // Transform the data to match the Student type
      const studentList: Student[] = data.map((student: any) => ({
        id: student.id,
        name: student.full_name,
        email: student.email,
        status: student.status
      }));
      
      setStudents(studentList);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load student list");
    }
  };
  
  // Handle date range changes
  const handleDateRangeChange = (range: DateRange) => {
    setDateRange({
      from: range.from,
      to: range.to
    });
  };
  
  // Handle student selection
  const handleStudentSelect = (student: Student | null) => {
    setSelectedStudent(student);
  };
  
  // Formatted date range for display
  const dateRangeText = useMemo(() => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
    }
    return "All time";
  }, [dateRange]);
  
  // Handle export
  const handleExport = () => {
    setShowExport(true);
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Student Analytics</h1>
          <p className="text-gray-600">
            {selectedStudent 
              ? `Viewing data for ${selectedStudent.name}` 
              : "Viewing data for all students"}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <DateRangePicker
            dateRange={dateRange}
            onChange={(newRange) => handleDateRangeChange(newRange)}
          />
          
          <div className="w-full sm:w-64">
            <StudentSelector
              students={students}
              selectedStudent={selectedStudent}
              onStudentSelect={handleStudentSelect}
            />
          </div>
          
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleExport}
          >
            <DownloadCloud className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>
      
      {/* Analytics Summary */}
      <AnalyticsSummaryCards
        activeStudents={summary.activeStudents}
        totalSessions={summary.totalSessions}
        totalQueries={summary.totalQueries}
        avgSessionMinutes={summary.avgSessionMinutes}
        isLoading={isLoading}
      />
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="student-performance">Student Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Study Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Study Time by Week</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <StudyTimeChart data={studyTime} isLoading={isLoading} />
            </CardContent>
          </Card>
          
          {/* Topics and Sessions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Popular Topics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Most Popular Topics</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <TopicsChart data={topics} isLoading={isLoading} />
              </CardContent>
            </Card>
            
            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent className="h-80 overflow-auto">
                <SessionsTable sessions={sessions} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="student-performance">
          <StudentPerformancePanel
            schoolId={schoolId || ''}
            selectedStudentId={selectedStudent?.id}
            dateRange={dateRange}
          />
        </TabsContent>
      </Tabs>
      
      {/* Export Dialog */}
      {showExport && (
        <AnalyticsExport
          data={{
            summary,
            sessions,
            topics,
            studyTime
          }}
          dateRange={dateRangeText}
          studentName={selectedStudent?.name}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
};

export default TeacherAnalytics;
