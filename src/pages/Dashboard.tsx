
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText, BarChart3, Settings, Video, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import { isSchoolAdmin, getUserRoleWithFallback } from "@/utils/apiHelpers";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lecture, Assessment } from "@/utils/supabaseHelpers";
import { executeWithTimeout } from "@/utils/networkHelpers";

// Dashboard Cards Component
interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, buttonText, onClick }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start mb-4">
          <div className="text-learnable-blue mr-4">{icon}</div>
          <div>
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 mb-4">{description}</p>
          </div>
        </div>
        <Button 
          onClick={onClick} 
          className="w-full bg-blue-600 hover:bg-blue-700"
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
  const { user, profile, userRole } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [upcomingAssessments, setUpcomingAssessments] = useState<UpcomingAssessmentProps[]>([]);
  const [recentLectures, setRecentLectures] = useState<Partial<Lecture>[]>([]);
  const [loading, setLoading] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState<string | null>(null);
  const [lecturesError, setLecturesError] = useState<string | null>(null); 
  const navigate = useNavigate();
  
  // Redirect check for admin/teacher users with proper dependency array
  const checkAndRedirect = useCallback(() => {
    // Get both context role and fallback role to ensure we catch all cases
    const fallbackRole = getUserRoleWithFallback();
    const effectiveRole = userRole || fallbackRole;
    
    // More comprehensive check for school admin roles
    if (isSchoolAdmin(effectiveRole)) {
      setIsRedirecting(true);
      toast.info("Redirecting to School Admin Dashboard...");
      navigate("/admin", { state: { preserveContext: true, adminRedirect: true }, replace: true });
      return true;
    } else if (effectiveRole === 'teacher') {
      setIsRedirecting(true);
      toast.info("Redirecting to Teacher Dashboard...");
      navigate("/teacher/students", { state: { preserveContext: true }, replace: true });
      return true;
    } else {
      return false;
    }
  }, [userRole, navigate]);

  useEffect(() => {
    let isMounted = true;

    // Only redirect if we haven't started redirecting yet
    if (!isRedirecting && user) {
      const shouldRedirect = checkAndRedirect();
      if (!shouldRedirect) {
        // Fetch student dashboard data
        const fetchDashboardData = async () => {
          if (!isMounted) return;
          setLoading(true);
          
          // Fetch upcoming assessments with timeout protection
          try {
            const { data: assessments, error: assessmentsError } = await executeWithTimeout(
              async () => {
                return await supabase
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
              },
              5000 // 5 seconds timeout
            );

            if (!isMounted) return;
            
            if (assessmentsError) {
              console.error("Error fetching assessments:", assessmentsError);
              setAssessmentsError("Could not load upcoming assessments");
              setUpcomingAssessments([]);
            } else if (assessments && assessments.length > 0) {
              setAssessmentsError(null);
              setUpcomingAssessments(assessments.map(assessment => ({
                id: assessment.id,
                title: assessment.title,
                dueDate: assessment.due_date,
                subject: assessment.subject || undefined
              })));
            } else {
              // Empty array for no assessments
              setAssessmentsError(null);
              setUpcomingAssessments([]);
            }
          } catch (err) {
            if (!isMounted) return;
            console.error("Error fetching assessments:", err);
            setAssessmentsError("Could not connect to server");
            setUpcomingAssessments([]);
          }

          // Fetch recent lectures with timeout protection
          try {
            const { data: lectures, error: lecturesError } = await executeWithTimeout(
              async () => {
                return await supabase
                  .from("lectures")
                  .select(`
                    id,
                    title,
                    thumbnail_url,
                    created_at
                  `)
                  .order('created_at', { ascending: false })
                  .limit(3);
              },
              5000 // 5 seconds timeout
            );

            if (!isMounted) return;
            
            if (lecturesError) {
              console.error("Error fetching lectures:", lecturesError);
              setLecturesError("Could not load recent lectures");
              setRecentLectures([]);
            } else {
              setLecturesError(null);
              setRecentLectures(lectures || []);
            }
          } catch (err) {
            if (!isMounted) return;
            console.error("Error fetching lectures:", err);
            setLecturesError("Could not connect to server");
            setRecentLectures([]);
          }

          if (isMounted) {
            setLoading(false);
          }
        };
        
        fetchDashboardData();
      }
    }

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, userRole, isRedirecting, checkAndRedirect]);

  // If we're redirecting or user is a school admin/teacher, show loading state
  if (isRedirecting || isSchoolAdmin(userRole) || isSchoolAdmin(getUserRoleWithFallback()) || userRole === 'teacher') {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <p className="text-xl mb-4">Redirecting to appropriate dashboard...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Standard student dashboard below
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name || user?.user_metadata?.full_name || "Student"}</h1>
          <p className="text-gray-600">
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
              />
              
              <DashboardCard
                title="Assessments"
                description="View and complete your assigned assessments"
                icon={<FileText className="h-10 w-10" />}
                buttonText="Go to Assessments"
                onClick={() => navigate("/student/assessments", { state: { preserveContext: true } })}
              />
              
              <DashboardCard
                title="Video Lectures"
                description="Watch educational videos and course content"
                icon={<Video className="h-10 w-10" />}
                buttonText="Go to Lectures"
                onClick={() => navigate("/student/lectures", { state: { preserveContext: true } })}
              />
              
              <DashboardCard
                title="My Progress"
                description="Track your performance and learning progress"
                icon={<BarChart3 className="h-10 w-10" />}
                buttonText="Go to My Progress"
                onClick={() => navigate("/student/progress", { state: { preserveContext: true } })}
              />
            </div>
          </div>
          
          <div className="col-span-1 md:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Upcoming Assessments
                  </h3>
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
                ) : loading && upcomingAssessments.length === 0 ? (
                  <div className="min-h-[100px] flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-gray-600 text-sm">Loading assessments...</span>
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
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Video className="h-5 w-5 mr-2 text-blue-600" />
                    Recent Lectures
                  </h3>
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
                ) : loading && recentLectures.length === 0 ? (
                  <div className="min-h-[100px] flex items-center justify-center">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-gray-600 text-sm">Loading lectures...</span>
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
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-blue-600" />
                    Settings
                  </h3>
                </div>
                
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full text-left justify-start"
                    onClick={() => navigate("/student/settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-left justify-start"
                    onClick={() => navigate("/student/settings")}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Notification Preferences
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
