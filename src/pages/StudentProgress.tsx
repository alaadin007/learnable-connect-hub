import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend 
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Activity, Clock, BookOpen, Video, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { executeWithTimeout } from "@/utils/networkHelpers";

interface PerformanceMetrics {
  assessments_completed: number;
  assessments_taken: number;
  avg_score: number;
  avg_time_spent_seconds: number;
  completion_rate: number;
  top_strengths: string | null;
  top_weaknesses: string | null;
}

interface SessionData {
  date: string;
  minutes: number;
  topic: string;
}

interface LectureProgress {
  id: string;
  title: string;
  progress: number;
  last_watched: string;
  duration_minutes: number;
  completed: boolean;
}

// Create empty default state objects to avoid "undefined" errors
const defaultMetrics: PerformanceMetrics = {
  assessments_completed: 0,
  assessments_taken: 0,
  avg_score: 0,
  avg_time_spent_seconds: 0,
  completion_rate: 0,
  top_strengths: null,
  top_weaknesses: null
};

const StudentProgress = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PerformanceMetrics>(defaultMetrics);
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [lectureProgress, setLectureProgress] = useState<LectureProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [lecturesError, setLecturesError] = useState<string | null>(null);

  useEffect(() => {
    // Keep track of mounted state
    let isMounted = true;

    // Redirect if not logged in or not a student
    if (!user) {
      navigate("/login");
      return;
    }

    if (profile && profile.user_type !== "student") {
      navigate("/dashboard");
      return;
    }

    const fetchData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      if (!schoolId || !user) {
        setLoading(false);
        return;
      }

      // 1. Fetch performance metrics with timeout protection
      try {
        const { data: metricsData, error: metricsError } = await executeWithTimeout(
          async () => {
            return await supabase
              .from("student_performance_metrics")
              .select("*")
              .eq("student_id", user.id)
              .eq("school_id", schoolId)
              .single();
          },
          5000 // 5 seconds timeout
        );

        if (!isMounted) return;

        if (metricsError && metricsError.code !== 'PGRST116') {
          console.error("Error fetching student metrics:", metricsError);
          setMetricsError("Failed to load performance metrics");
        } else {
          // If metrics data exists, use it; otherwise use defaults
          setMetricsError(null);
          setMetrics(metricsData || defaultMetrics);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error in metrics fetch:", err);
        setMetricsError("Could not connect to server");
      }

      // 2. Fetch session logs with timeout protection
      try {
        const { data: sessionLogs, error: sessionError } = await executeWithTimeout(
          async () => {
            return await supabase
              .from("session_logs")
              .select("*")
              .eq("user_id", user.id)
              .eq("school_id", schoolId)
              .order("session_start", { ascending: false });
          },
          5000 // 5 seconds timeout
        );

        if (!isMounted) return;

        if (sessionError) {
          console.error("Error fetching session logs:", sessionError);
          setSessionsError("Failed to load session data");
          setSessionData([]);
        } else {
          setSessionsError(null);
          // Process session data for the chart
          const processedSessions = (sessionLogs || []).map((session: any) => {
            let sessionDuration = 0;
            if (session.session_end) {
              const startTime = new Date(session.session_start).getTime();
              const endTime = new Date(session.session_end).getTime();
              sessionDuration = Math.round((endTime - startTime) / (1000 * 60)); // in minutes
            }

            return {
              date: new Date(session.session_start).toLocaleDateString(),
              minutes: sessionDuration,
              topic: session.topic_or_content_used || 'General'
            };
          });
          
          setSessionData(processedSessions);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error in session logs fetch:", err);
        setSessionsError("Could not connect to server");
        setSessionData([]);
      }

      // 3. Fetch lecture progress with timeout protection
      try {
        const { data: lectureData, error: lectureError } = await executeWithTimeout(
          async () => {
            return await supabase
              .from("lecture_progress")
              .select(`
                id,
                lectures (title, duration_minutes),
                progress,
                last_watched,
                completed
              `)
              .eq("student_id", user.id)
              .order("last_watched", { ascending: false });
          },
          5000 // 5 seconds timeout
        );

        if (!isMounted) return;

        if (lectureError) {
          console.error("Error fetching lecture progress:", lectureError);
          setLecturesError("Failed to load lecture progress");
          setLectureProgress([]);
        } else {
          setLecturesError(null);
          // Process lecture data
          const processedLectures = (lectureData || []).map((item: any) => ({
            id: item.id,
            title: item.lectures?.title || "Untitled Lecture",
            progress: item.progress,
            last_watched: new Date(item.last_watched).toLocaleDateString(),
            duration_minutes: item.lectures?.duration_minutes || 0,
            completed: item.completed
          }));

          setLectureProgress(processedLectures);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error in lecture progress fetch:", err);
        setLecturesError("Could not connect to server");
        setLectureProgress([]);
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, profile, schoolId, navigate]);

  // Prepare data for pie chart
  const pieData = metrics ? [
    { name: 'Completed', value: metrics.assessments_completed, color: '#10B981' },
    { 
      name: 'Incomplete', 
      value: Math.max(0, metrics.assessments_taken - metrics.assessments_completed), 
      color: '#F59E0B' 
    }
  ] : [];

  const COLORS = ['#10B981', '#F59E0B'];

  // Function to render "No data available" message
  const renderNoDataMessage = (message: string) => (
    <div className="text-center py-8">
      <p className="text-gray-500">{message}</p>
    </div>
  );

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">My Learning Progress</h1>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="mb-6 grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="lectures">Lectures</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsError ? (
                    <div className="text-sm text-red-600">{metricsError}</div>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-learnable-blue">
                        {metrics ? Math.round(metrics.avg_score) : 0}%
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {metrics?.assessments_completed || 0} completed assessments
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-500" />
                    Completion Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsError ? (
                    <div className="text-sm text-red-600">{metricsError}</div>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-green-600">
                        {metrics ? Math.round(metrics.completion_rate) : 0}%
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {metrics?.assessments_completed || 0} of {metrics?.assessments_taken || 0} assessments completed
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-blue-500" />
                    Average Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsError ? (
                    <div className="text-sm text-red-600">{metricsError}</div>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-blue-600">
                        {metrics ? Math.round((metrics.avg_time_spent_seconds || 0) / 60) : 0} min
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Average time spent on assessments
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Study Sessions Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Study Sessions History</CardTitle>
              </CardHeader>
              <CardContent>
                {sessionsError ? (
                  <div className="bg-red-50 p-4 rounded-md text-red-600">
                    <AlertCircle className="h-5 w-5 mb-2" />
                    <p>{sessionsError}</p>
                  </div>
                ) : sessionData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sessionData.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value, name) => [`${value} minutes`, name]} />
                        <Legend />
                        <Bar dataKey="minutes" name="Study Time" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  renderNoDataMessage("No study session data available")
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="assessments">
            {/* Assessment Completion Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Completion</CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsError ? (
                    <div className="bg-red-50 p-4 rounded-md text-red-600">
                      <AlertCircle className="h-5 w-5 mb-2" />
                      <p>{metricsError}</p>
                    </div>
                  ) : pieData.length > 0 && (pieData[0].value > 0 || pieData[1].value > 0) ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} assessments`, 'Count']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    renderNoDataMessage("No assessment data available")
                  )}
                </CardContent>
              </Card>
              
              {/* Strengths and Weaknesses */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsError ? (
                    <div className="bg-red-50 p-4 rounded-md text-red-600">
                      <AlertCircle className="h-5 w-5 mb-2" />
                      <p>{metricsError}</p>
                    </div>
                  ) : metrics?.top_strengths || metrics?.top_weaknesses ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-green-700 mb-2">Your Strengths</h3>
                        {metrics?.top_strengths ? (
                          <ul className="list-disc ml-5 space-y-2">
                            {metrics.top_strengths.split(', ').map((strength, index) => (
                              <li key={index} className="text-gray-700">{strength}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No strengths data available yet.</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium text-amber-700 mb-2">Areas to Improve</h3>
                        {metrics?.top_weaknesses ? (
                          <ul className="list-disc ml-5 space-y-2">
                            {metrics.top_weaknesses.split(', ').map((weakness, index) => (
                              <li key={index} className="text-gray-700">{weakness}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500">No improvement areas data available yet.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    renderNoDataMessage("No performance analysis data available")
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="lectures">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Course Lectures Progress
                  </CardTitle>
                  <CardDescription>
                    Track your progress through course lectures
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lecturesError ? (
                    <div className="bg-red-50 p-4 rounded-md text-red-600">
                      <AlertCircle className="h-5 w-5 mb-2" />
                      <p>{lecturesError}</p>
                    </div>
                  ) : lectureProgress.length > 0 ? (
                    <div className="space-y-6">
                      {lectureProgress.map((lecture) => (
                        <div key={lecture.id} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium flex items-center">
                              <Video className="h-4 w-4 mr-2 text-blue-600" />
                              {lecture.title}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {lecture.completed ? 'Completed' : `${lecture.progress}% complete`}
                            </span>
                          </div>
                          <Progress value={lecture.progress} className="h-2" />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Last watched: {lecture.last_watched}</span>
                            <span>{lecture.duration_minutes} min</span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="pt-4 text-center">
                        <button 
                          onClick={() => navigate('/student/lectures')} 
                          className="text-blue-600 hover:underline"
                        >
                          View all lectures
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">No lecture progress data available yet.</p>
                      <button 
                        onClick={() => navigate('/student/lectures')} 
                        className="text-blue-600 hover:underline"
                      >
                        Browse available lectures
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </>
  );
};

export default StudentProgress;
