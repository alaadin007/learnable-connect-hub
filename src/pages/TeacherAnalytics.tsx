import { useEffect, useState } from "react";
import { DateRange, Student, TeacherAnalyticsData } from "@/components/analytics/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTeacherAnalytics, adaptTeacherAnalyticsData } from "@/utils/analyticsUtils";
import { useAuth } from "@/contexts/AuthContext";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { StudentSelector } from "@/components/analytics/StudentSelector";
import { StatsCard } from "@/components/analytics/StatsCard";
import { getMockAnalyticsData } from "@/utils/sessionLogging";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeacherAnalytics() {
  const { user, userRole, profile } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | undefined>(undefined);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState("summary");
  
  const [analyticsData, setAnalyticsData] = useState<TeacherAnalyticsData[]>([]);
  const [summary, setSummary] = useState({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });
  const [sessions, setSessions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [studyTime, setStudyTime] = useState([]);
  
  useEffect(() => {
    // Fetch students only once when the component mounts
    const fetchStudents = async () => {
      if (profile?.school_id) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("school_id", profile.school_id)
            .eq("user_type", "student");

          if (error) {
            console.error("Error fetching students:", error);
          } else {
            const studentList = data ? data.map((student) => ({
              id: student.id,
              name: student.full_name,
            })) : [];
            setStudents(studentList);
          }
        } catch (error) {
          console.error("Error fetching students:", error);
        }
      }
    };

    fetchStudents();
  }, [profile?.school_id]);

  useEffect(() => {
    if (profile?.organization?.id) {
      fetchData();
    }
  }, [dateRange, profile?.organization?.id]);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let data;
      
      if (profile?.organization?.id) {
        // Use the new fetchTeacherAnalytics function
        const teacherData = await fetchTeacherAnalytics(profile.organization.id, dateRange);
        data = adaptTeacherAnalyticsData(teacherData);
      } else {
        console.error("No school ID found in profile");
        return;
      }
      
      setAnalyticsData(data);
      
      // Use the mock data function for additional analytics info
      const mockData = getMockAnalyticsData(profile.organization.id);
      setSummary(mockData.summary);
      setSessions(mockData.sessions);
      setTopics(mockData.topics);
      setStudyTime(mockData.studyTime);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderDateRangePicker = () => (
    <DateRangePicker
      dateRange={dateRange}
      onDateRangeChange={handleDateRangeChange}
    />
  );

  const renderStudentSelector = () => (
    <StudentSelector
      students={students}
      selectedStudentId={selectedStudentId}
      onSelectStudent={setSelectedStudentId}
    />
  );

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Teacher Analytics</CardTitle>
          <CardDescription>
            Analyze teacher performance and student engagement metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {renderDateRangePicker()}
            {renderStudentSelector()}
          </div>

          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="studyTime">Study Time</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                  title="Active Students"
                  value={isLoading ? <Skeleton width={50} /> : summary.activeStudents.toString()}
                  description="Number of students actively using the platform"
                />
                <StatsCard
                  title="Total Sessions"
                  value={isLoading ? <Skeleton width={50} /> : summary.totalSessions.toString()}
                  description="Total number of learning sessions"
                />
                <StatsCard
                  title="Total Queries"
                  value={isLoading ? <Skeleton width={50} /> : summary.totalQueries.toString()}
                  description="Total number of queries made by students"
                />
                <StatsCard
                  title="Avg. Session Minutes"
                  value={isLoading ? <Skeleton width={50} /> : summary.avgSessionMinutes.toString()}
                  description="Average duration of learning sessions"
                />
              </div>
            </TabsContent>
            <TabsContent value="teachers" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Teacher Performance</h3>
                {isLoading ? (
                  <div>Loading teacher data...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyticsData.map((teacher) => (
                      <Card key={teacher.id}>
                        <CardHeader>
                          <CardTitle>{teacher.name}</CardTitle>
                          <CardDescription>Performance Metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>Assessments Created: {teacher.assessmentsCount}</p>
                          <p>Average Score: {teacher.averageScore.toFixed(2)}</p>
                          <p>Completion Rate: {teacher.completionRate.toFixed(2)}%</p>
                          <p>Students Assessed: {teacher.studentsAssessed}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="students" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Student Performance</h3>
                {isLoading ? (
                  <div>Loading student data...</div>
                ) : (
                  <div>
                    {/* Student performance data will be displayed here */}
                    <p>Coming soon!</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="topics" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Popular Topics</h3>
                {isLoading ? (
                  <div>Loading topic data...</div>
                ) : (
                  <div>
                    {/* Topic data will be displayed here */}
                    <p>Coming soon!</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="sessions" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Session Details</h3>
                {isLoading ? (
                  <div>Loading session data...</div>
                ) : (
                  <div>
                    {/* Session data will be displayed here */}
                    <p>Coming soon!</p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="studyTime" className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Study Time Analysis</h3>
                {isLoading ? (
                  <div>Loading study time data...</div>
                ) : (
                  <div>
                    {/* Study time data will be displayed here */}
                    <p>Coming soon!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
