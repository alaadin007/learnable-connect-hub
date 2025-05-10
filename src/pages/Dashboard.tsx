import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Settings, 
  Video, 
  Calendar,
  BookOpen,
  Plus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/components/auth/ProtectedRoute";
import { usePagePerformance } from "@/hooks/usePagePerformance";
import { Lecture } from "@/utils/supabaseHelpers";

// Dashboard Cards Component
interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  iconBackground?: string;
  iconColor?: string;
}

const DashboardCard = ({ 
  title, 
  description, 
  icon, 
  buttonText, 
  onClick,
  iconBackground = "bg-purple-100",
  iconColor = "text-purple-600"
}: DashboardCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow border-t-4 border-t-purple-500">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start mb-4">
          <div className={`${iconBackground} p-3 rounded-full mr-4`}>
            <div className={`${iconColor}`}>{icon}</div>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
          </div>
        </div>
        <Button 
          onClick={onClick} 
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};

interface UpcomingAssessmentProps {
  id: string;
  title: string;
  dueDate: string | null;
  subject?: string;
}

const UpcomingAssessmentCard: React.FC<UpcomingAssessmentProps> = ({ id, title, dueDate, subject }) => {
  const navigate = useNavigate();
  
  return (
    <div 
      className="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
      onClick={() => navigate(`/student/assessment/${id}`)}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium">{title}</h4>
          {subject && <p className="text-sm text-gray-500">{subject}</p>}
        </div>
        {dueDate && (
          <div className="text-sm text-red-600 font-medium">
            Due: {new Date(dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-6 text-gray-500">
    <p>{message}</p>
  </div>
);

const Dashboard = () => {
  // Performance tracking
  usePagePerformance("Dashboard");
  
  const { user, profile, userRole } = useAuth();
  const [upcomingAssessments, setUpcomingAssessments] = useState<UpcomingAssessmentProps[]>([]);
  const [recentLectures, setRecentLectures] = useState<Partial<Lecture>[]>([]);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null);
  const [lecturesError, setLecturesError] = useState<string | null>(null); 
  const navigate = useNavigate();
  
  // Get effective user role, fallback to stored role if context hasn't loaded yet
  const fallbackRole = getUserRoleWithFallback();
  const effectiveRole = useMemo(() => userRole || fallbackRole, [userRole, fallbackRole]);
  const isAdmin = useMemo(() => isSchoolAdmin(effectiveRole as UserRole), [effectiveRole]);
  
  // Determine if we need to redirect based on role
  useEffect(() => {
    if (user) {
      if (isAdmin) {
        navigate("/admin", { state: { preserveContext: true, adminRedirect: true }, replace: true });
      } else if (effectiveRole === 'teacher') {
        navigate("/teacher/dashboard", { state: { preserveContext: true }, replace: true });
      }
    }
  }, [user, effectiveRole, isAdmin, navigate]);

  // Fetch student dashboard data in parallel
  useEffect(() => {
    if (!user || isAdmin || effectiveRole === 'teacher') {
      return;
    }
    
    // Fetch both assessments and lectures in parallel
    const fetchDashboardData = async () => {
      // Use Promise.all to fetch both in parallel
      await Promise.all([
        // Fetch upcoming assessments
        (async () => {
          try {
            const { data: assessments, error: assessmentsError } = await supabase
              .from("assessments")
              .select(`
                id, 
                title, 
                due_date,
                subject
              `)
              .gt('due_date', new Date().toISOString())
              .order('due_date', { ascending: true })
              .limit(3);

            if (assessmentsError) {
              console.error("Error fetching assessments:", assessmentsError);
              setAssessmentsError("Could not load upcoming assessments");
            } else {
              setAssessmentsError(null);
              setUpcomingAssessments(assessments ? assessments.map(assessment => ({
                id: assessment.id,
                title: assessment.title,
                dueDate: assessment.due_date,
                subject: assessment.subject || undefined
              })) : []);
            }
          } catch (err) {
            console.error("Error fetching assessments:", err);
            setAssessmentsError("Could not connect to server");
          }
        })(),
        
        // Fetch recent lectures
        (async () => {
          try {
            const { data: lectures, error: lecturesError } = await supabase
              .from("lectures")
              .select(`
                id,
                title,
                thumbnail_url,
                created_at
              `)
              .order('created_at', { ascending: false })
              .limit(3);
            
            if (lecturesError) {
              console.error("Error fetching lectures:", lecturesError);
              setLecturesError("Could not load recent lectures");
            } else {
              setLecturesError(null);
              setRecentLectures(lectures || []);
            }
          } catch (err) {
            console.error("Error fetching lectures:", err);
            setLecturesError("Could not connect to server");
          }
        })()
      ]);
    };
    
    fetchDashboardData();
  }, [user, effectiveRole, isAdmin]);

  // If we're redirecting, render minimal content to avoid flicker
  if (isAdmin || effectiveRole === 'teacher') {
    return null;
  }

  // Standard student dashboard below - with enhanced styling
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="mb-8 bg-purple-700 text-white p-6 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name || user?.user_metadata?.full_name || "Student"}</h1>
          <p className="text-purple-100">
            Access your learning resources and complete your assessments
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="col-span-1 md:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DashboardCard
                title="Chat with AI"
                description="Get help with your studies from our AI learning assistant"
                icon={<MessageSquare className="h-10 w-10" />}
                buttonText="Go to Chat with AI"
                onClick={() => navigate("/chat", { state: { preserveContext: true } })}
                iconBackground="bg-blue-100"
                iconColor="text-blue-600"
              />
              
              <DashboardCard
                title="Assessments"
                description="View and complete your assigned assessments"
                icon={<FileText className="h-10 w-10" />}
                buttonText="Go to Assessments"
                onClick={() => navigate("/student/assessments", { state: { preserveContext: true } })}
                iconBackground="bg-green-100"
                iconColor="text-green-600"
              />
              
              <DashboardCard
                title="Video Lectures"
                description="Watch educational videos and course content"
                icon={<Video className="h-10 w-10" />}
                buttonText="Go to Lectures"
                onClick={() => navigate("/student/lectures", { state: { preserveContext: true } })}
                iconBackground="bg-amber-100"
                iconColor="text-amber-600"
              />
              
              <DashboardCard
                title="My Progress"
                description="Track your performance and learning progress"
                icon={<BarChart3 className="h-10 w-10" />}
                buttonText="Go to My Progress"
                onClick={() => navigate("/student/progress", { state: { preserveContext: true } })}
                iconBackground="bg-purple-100"
                iconColor="text-purple-600"
              />
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Card className="border-t-4 border-t-amber-500">
              <CardHeader className="bg-amber-50 pb-2">
                <CardTitle className="flex items-center text-amber-800">
                  <Calendar className="h-5 w-5 mr-2 text-amber-600" />
                  Upcoming Assessments
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Due this week</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/student/assessments")}
                  >
                    View All
                  </Button>
                </div>
                
                {assessmentsError ? (
                  <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm">
                    {assessmentsError}
                  </div>
                ) : upcomingAssessments.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingAssessments.map(assessment => (
                      <UpcomingAssessmentCard 
                        key={assessment.id}
                        id={assessment.id}
                        title={assessment.title}
                        dueDate={assessment.dueDate}
                        subject={assessment.subject}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No upcoming assessments" />
                )}
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-blue-500">
              <CardHeader className="bg-blue-50 pb-2">
                <CardTitle className="flex items-center text-blue-800">
                  <Video className="h-5 w-5 mr-2 text-blue-600" />
                  Recent Lectures
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">Latest materials</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate("/student/lectures")}
                  >
                    View All
                  </Button>
                </div>
                
                {lecturesError ? (
                  <div className="bg-red-50 p-3 rounded-md text-red-600 text-sm">
                    {lecturesError}
                  </div>
                ) : recentLectures.length > 0 ? (
                  <div className="space-y-3">
                    {recentLectures.map(lecture => (
                      <Link 
                        key={lecture.id}
                        to={`/student/lecture/${lecture.id}`}
                        className="block p-4 border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                            {lecture.thumbnail_url ? (
                              <img 
                                src={lecture.thumbnail_url} 
                                alt="" 
                                className="w-full h-full object-cover rounded" 
                              />
                            ) : (
                              <Video className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium line-clamp-1">{lecture.title}</h4>
                            <p className="text-xs text-gray-500">
                              Added {lecture.created_at ? new Date(lecture.created_at).toLocaleDateString() : 'Recently'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No recent lectures" />
                )}
              </CardContent>
            </Card>
            
            <Card className="border-t-4 border-t-green-500">
              <CardHeader className="bg-green-50 pb-2">
                <CardTitle className="flex items-center text-green-800">
                  <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                  Study Materials
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-500">Your learning resources</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/documents')}
                    className="flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full text-left justify-start"
                    onClick={() => navigate("/documents")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View All Documents
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full text-left justify-start"
                    onClick={() => navigate("/student/settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Dashboard;
