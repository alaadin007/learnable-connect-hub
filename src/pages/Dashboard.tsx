
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Book, BarChart2, UserPlus, School, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { sessionLogger } from "@/utils/sessionLogging";
import { supabase } from "@/integrations/supabase/client";

// Placeholder dashboard - will be expanded in future iterations
const Dashboard = () => {
  const { userRole, isSuperviser, signOut } = useAuth();
  const [analytics, setAnalytics] = useState({
    activeStudents: 0,
    totalSessions: 0,
    totalQueries: 0,
    avgSessionMinutes: 0
  });
  const [studentMetrics, setStudentMetrics] = useState({
    weeklyHours: 0,
    totalSessions: 0,
    topTopic: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch analytics data based on user role
    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        if (userRole === 'school' || userRole === 'teacher') {
          // For school admins and teachers, fetch school-level analytics
          const { data, error } = await supabase
            .from('school_analytics_summary')
            .select('*')
            .single();
            
          if (error) {
            console.error("Error fetching school analytics:", error);
          } else if (data) {
            setAnalytics({
              activeStudents: data.active_students || 0,
              totalSessions: data.total_sessions || 0,
              totalQueries: data.total_queries || 0,
              avgSessionMinutes: Math.round(Number(data.avg_session_minutes) || 0)
            });
          }
        } else if (userRole === 'student') {
          // For students, fetch their personal metrics
          const currentYear = new Date().getFullYear();
          const currentWeek = Math.floor(Number((new Date() - new Date(currentYear, 0, 1)) / 86400000 / 7) + 1);
          
          // Get student's weekly study time
          const { data: weeklyData } = await supabase
            .from('student_weekly_study_time')
            .select('study_hours')
            .eq('year', currentYear)
            .eq('week_number', currentWeek)
            .maybeSingle();
          
          // Get student's total sessions
          const { count: sessionCount } = await supabase
            .from('session_logs')
            .select('*', { count: 'exact' });
          
          // Get student's most studied topic
          const { data: topicData } = await supabase
            .from('most_studied_topics')
            .select('topic_or_content_used')
            .eq('topic_rank', 1)
            .maybeSingle();
          
          setStudentMetrics({
            weeklyHours: weeklyData?.study_hours || 0,
            totalSessions: sessionCount || 0,
            topTopic: topicData?.topic_or_content_used || 'No data yet'
          });
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if user is logged in
    if (userRole) {
      fetchAnalytics();
    }
  }, [userRole]);
  
  const handleSignOut = async () => {
    // If there's an active session, end it before signing out
    if (sessionLogger.hasActiveSession()) {
      try {
        await sessionLogger.endSession();
        console.log("Session ended on sign out");
      } catch (error) {
        console.error("Failed to end session on sign out:", error);
      }
    }
    
    await signOut();
  };
  
  // Start a session when the dashboard is loaded
  useEffect(() => {
    // Only start tracking for student users
    if (userRole === 'student') {
      const startDashboardSession = async () => {
        try {
          const sessionId = await sessionLogger.startSession('Dashboard exploration');
          console.log("Started session tracking with ID:", sessionId);
        } catch (error) {
          console.error("Failed to start session tracking:", error);
          // Don't show error to user, just log it
        }
      };
      
      startDashboardSession();
      
      // Clean up session when component unmounts
      return () => {
        if (sessionLogger.hasActiveSession()) {
          sessionLogger.endSession()
            .then(() => console.log("Dashboard session ended"))
            .catch(err => console.error("Failed to end dashboard session:", err));
        }
      };
    }
  }, [userRole]);
  
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text mb-2">Dashboard</h1>
          <p className="text-learnable-gray">
            Welcome to your LearnAble dashboard.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="flex items-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {(userRole === 'school' || userRole === 'teacher') && (
          <>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Students</CardTitle>
                <Users className="h-5 w-5 text-learnable-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : analytics.activeStudents}</div>
                <p className="text-xs text-muted-foreground">Active students</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Sessions</CardTitle>
                <MessageSquare className="h-5 w-5 text-learnable-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : analytics.totalSessions}</div>
                <p className="text-xs text-muted-foreground">Total learning sessions</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Queries</CardTitle>
                <Book className="h-5 w-5 text-learnable-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : analytics.totalQueries}</div>
                <p className="text-xs text-muted-foreground">Total student queries</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Avg. Time</CardTitle>
                <BarChart2 className="h-5 w-5 text-learnable-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : `${analytics.avgSessionMinutes} min`}
                </div>
                <p className="text-xs text-muted-foreground">Average session length</p>
              </CardContent>
            </Card>
          </>
        )}
        
        {userRole === 'student' && (
          <>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Weekly Study</CardTitle>
                <BarChart2 className="h-5 w-5 text-learnable-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : `${Number(studentMetrics.weeklyHours).toFixed(1)} hrs`}
                </div>
                <p className="text-xs text-muted-foreground">This week's study time</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Sessions</CardTitle>
                <MessageSquare className="h-5 w-5 text-learnable-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : studentMetrics.totalSessions}</div>
                <p className="text-xs text-muted-foreground">Your learning sessions</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Top Topic</CardTitle>
                <Book className="h-5 w-5 text-learnable-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-ellipsis overflow-hidden">
                  {isLoading ? '...' : studentMetrics.topTopic}
                </div>
                <p className="text-xs text-muted-foreground">Your most studied topic</p>
              </CardContent>
            </Card>
            <Card className="card-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Progress</CardTitle>
                <BarChart2 className="h-5 w-5 text-learnable-green" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Learning progress</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>AI Learning Assistant</CardTitle>
            <CardDescription>Start a conversation with the AI learning assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full gradient-bg" 
              onClick={() => toast.info("AI assistant feature coming soon.")}
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Start a conversation
            </Button>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {userRole === 'school' && isSuperviser && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link to="/school-admin">
                  <School className="mr-2 h-4 w-4" /> School Admin Panel
                </Link>
              </Button>
            )}
            
            {(userRole === 'school' || userRole === 'teacher') && (
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                asChild
              >
                <Link to="/students">
                  <Users className="mr-2 h-4 w-4" /> Manage Students
                </Link>
              </Button>
            )}
            
            {userRole === 'school' && isSuperviser && (
              <Button 
                variant="outline" 
                className="w-full justify-start"
                asChild
              >
                <Link to="/school-admin">
                  <UserPlus className="mr-2 h-4 w-4" /> Invite Teachers
                </Link>
              </Button>
            )}
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast.info("Reports and analytics coming soon.")}
            >
              <BarChart2 className="mr-2 h-4 w-4" /> View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
