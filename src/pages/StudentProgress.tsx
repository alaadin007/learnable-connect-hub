
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
  CardTitle 
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
import { Loader2, Trophy, Activity, Clock } from "lucide-react";

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

const StudentProgress = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [sessionData, setSessionData] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
      setLoading(true);
      try {
        // Fetch performance metrics
        if (!schoolId || !user) return;

        // Get student performance metrics
        const { data: metricsData, error: metricsError } = await supabase
          .from("student_performance_metrics")
          .select("*")
          .eq("student_id", user.id)
          .eq("school_id", schoolId)
          .single();

        if (metricsError) throw metricsError;
        
        setMetrics(metricsData);

        // Get session logs for the student
        const { data: sessionLogs, error: sessionError } = await supabase
          .from("session_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("school_id", schoolId)
          .order("session_start", { ascending: false });

        if (sessionError) throw sessionError;
        
        // Process session data for the chart
        const processedSessions = sessionLogs.map((session: any) => {
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
      } catch (err: any) {
        console.error("Error fetching student progress data:", err);
        setError(err.message || "Failed to load progress data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, profile, schoolId, navigate]);

  // Prepare data for pie chart
  const pieData = metrics ? [
    { name: 'Completed', value: metrics.assessments_completed, color: '#10B981' },
    { 
      name: 'Incomplete', 
      value: metrics.assessments_taken - metrics.assessments_completed, 
      color: '#F59E0B' 
    }
  ] : [];

  const COLORS = ['#10B981', '#F59E0B'];

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">My Learning Progress</h1>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-learnable-blue" />
            <span className="ml-2">Loading progress data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-500">{error}</div>
        ) : !metrics ? (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <p className="text-xl text-gray-600">No progress data available yet.</p>
            <p className="text-gray-500 mt-2">Complete some assessments to see your progress.</p>
          </div>
        ) : (
          <>
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
                  <p className="text-4xl font-bold text-learnable-blue">{Math.round(metrics.avg_score)}%</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Based on {metrics.assessments_completed} completed assessments
                  </p>
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
                  <p className="text-4xl font-bold text-green-600">{Math.round(metrics.completion_rate)}%</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {metrics.assessments_completed} of {metrics.assessments_taken} assessments completed
                  </p>
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
                  <p className="text-4xl font-bold text-blue-600">
                    {Math.round(metrics.avg_time_spent_seconds / 60)} min
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Average time spent on assessments
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Assessment Completion Chart */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Assessment Completion</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
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
              </CardContent>
            </Card>

            {/* Study Sessions Chart */}
            {sessionData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Study Sessions History</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
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
                </CardContent>
              </Card>
            )}

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-700">Your Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.top_strengths ? (
                    <ul className="list-disc ml-5 space-y-2">
                      {metrics.top_strengths.split(', ').map((strength, index) => (
                        <li key={index} className="text-gray-700">{strength}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No strengths data available yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-amber-700">Areas to Improve</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.top_weaknesses ? (
                    <ul className="list-disc ml-5 space-y-2">
                      {metrics.top_weaknesses.split(', ').map((weakness, index) => (
                        <li key={index} className="text-gray-700">{weakness}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No improvement areas data available yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
      <Footer />
    </>
  );
};

export default StudentProgress;
