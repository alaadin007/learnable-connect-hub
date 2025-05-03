
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, BarChart3, Users, School, FileText, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      // Allow test accounts/navigation with preserved context to bypass this check
      if (location.state?.fromTestAccounts || location.state?.preserveContext) {
        console.log("Dashboard: Bypassing login check due to navigation context");
        return;
      }
      
      console.log("Dashboard: No user found, redirecting to login");
      navigate("/login");
    }
  }, [user, navigate, location.state]);

  // More targeted approach to role-based redirection
  useEffect(() => {
    // Only redirect on specific conditions
    const isDirectDashboardAccess = !location.state?.fromNavigation && 
                                   !location.state?.fromTestAccounts &&
                                   !location.state?.preserveContext &&
                                   !location.state?.fromDashboard;
    
    // Only redirect if we know the role and it's a direct access
    if (userRole && isDirectDashboardAccess) {
      // Only log if we're actually going to redirect
      console.log("Dashboard: Redirecting based on role", {
        userRole,
        isDirectDashboardAccess,
        locationState: location.state
      });
      
      if (userRole === "school" && profile?.organization?.id) {
        navigate("/admin", { replace: true, state: { fromDashboard: true, preserveContext: true } });
      } else if (userRole === "teacher") {
        navigate("/teacher/analytics", { replace: true, state: { fromDashboard: true, preserveContext: true } });
      }
      // Student stays on dashboard
    }
  }, [userRole, navigate, location.state, profile]);

  // Show loading state if user or profile data is not ready
  if (!user || !profile) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
          <p className="text-xl">Loading your dashboard...</p>
        </main>
      </>
    );
  }

  // Display welcome toast with role information for non-test accounts on first render
  useEffect(() => {
    // Only show toast for real users, not test accounts
    if (user && !user.email?.includes(".test@learnable.edu") && !location.state?.fromDashboard && !location.state?.fromNavigation) {
      const roleText = userRole === "school" ? "School Admin" : 
                       userRole === "teacher" ? "Teacher" : 
                       userRole === "student" ? "Student" : "User";
      
      toast.success(`Welcome ${profile?.full_name || ""}! You're logged in as: ${roleText}`, {
        duration: 5000,
        id: "role-notification", // Prevent duplicates
      });
    }
  }, [user, userRole, profile, location.state]);

  const renderUserDashboard = () => {
    const userType = profile?.user_type;

    if (userType === "school") {
      return (
        <>
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
            <h2 className="text-lg font-semibold text-blue-700">School Administrator Dashboard</h2>
            <p className="text-blue-600">
              You have full access to school management features, teacher management, and analytics.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard
              title="School Admin"
              description="Manage your school settings and configurations"
              icon={<School className="h-10 w-10" />}
              onClick={() => navigate("/admin", { state: { fromNavigation: true, preserveContext: true } })}
            />
            <DashboardCard
              title="Teacher Management"
              description="Add, remove, and manage teacher accounts"
              icon={<Users className="h-10 w-10" />}
              onClick={() => navigate("/admin/teacher-management", { state: { fromNavigation: true, preserveContext: true } })}
            />
            <DashboardCard
              title="Analytics"
              description="View school-wide performance analytics"
              icon={<BarChart3 className="h-10 w-10" />}
              onClick={() => navigate("/admin/analytics", { state: { fromNavigation: true, preserveContext: true } })}
            />
            <DashboardCard
              title="Chat with AI"
              description="Get help from our AI learning assistant"
              icon={<MessageSquare className="h-10 w-10" />}
              onClick={() => navigate("/chat", { state: { fromNavigation: true, preserveContext: true } })}
            />
          </div>
        </>
      );
    }

    if (userType === "teacher") {
      return (
        <>
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
            <h2 className="text-lg font-semibold text-green-700">Teacher Dashboard</h2>
            <p className="text-green-600">
              You can manage your students, view analytics, and access learning resources.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard
              title="Student Management"
              description="Manage your students and classes"
              icon={<Users className="h-10 w-10" />}
              onClick={() => navigate("/teacher/students", { state: { fromNavigation: true, preserveContext: true } })}
            />
            <DashboardCard
              title="Analytics"
              description="View student performance analytics"
              icon={<BarChart3 className="h-10 w-10" />}
              onClick={() => navigate("/teacher/analytics", { state: { fromNavigation: true, preserveContext: true } })}
            />
            <DashboardCard
              title="Chat with AI"
              description="Get help from our AI learning assistant"
              icon={<MessageSquare className="h-10 w-10" />}
              onClick={() => navigate("/chat", { state: { fromNavigation: true, preserveContext: true } })}
            />
          </div>
        </>
      );
    }

    // Default to student dashboard
    return (
      <>
        <div className="mb-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded shadow-sm">
          <h2 className="text-lg font-semibold text-purple-700">Student Dashboard</h2>
          <p className="text-purple-600">
            Access your learning resources, track your progress, and complete assessments.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Chat with AI"
            description="Get help with your studies from our AI learning assistant"
            icon={<MessageSquare className="h-10 w-10" />}
            onClick={() => navigate("/chat", { state: { fromNavigation: true, preserveContext: true } })}
          />
          <DashboardCard
            title="Assessments"
            description="View and complete your assigned assessments"
            icon={<FileText className="h-10 w-10" />}
            onClick={() => navigate("/student/assessments", { state: { fromNavigation: true, preserveContext: true } })}
          />
          <DashboardCard
            title="My Progress"
            description="Track your performance and learning progress"
            icon={<BarChart3 className="h-10 w-10" />}
            onClick={() => navigate("/student/progress", { state: { fromNavigation: true, preserveContext: true } })}
          />
          <DashboardCard
            title="Settings"
            description="Manage your profile and preferences"
            icon={<Settings className="h-10 w-10" />}
            onClick={() => navigate("/student/settings", { state: { fromNavigation: true, preserveContext: true } })}
          />
        </div>
      </>
    );
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {profile?.full_name || "User"}</h1>
          <p className="text-gray-600">
            {profile?.user_type === "school"
              ? "Manage your school, teachers, and view analytics"
              : profile?.user_type === "teacher"
              ? "Manage your students and view their progress"
              : "Access your learning resources and complete your assessments"}
          </p>
          {profile?.user_type === "student" && profile?.organization && (
            <p className="text-sm text-gray-500 mt-2">School: {profile.organization.name}</p>
          )}
          {!profile?.user_type && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md">
              <p className="text-yellow-700">
                Your user type is not set. Please contact an administrator to update your profile.
              </p>
            </div>
          )}
        </div>

        {renderUserDashboard()}
      </main>
      <Footer />
    </>
  );
};

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, onClick }) => {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick} tabIndex={0} onKeyPress={(e) => { if (e.key === 'Enter') onClick(); }}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <div className="text-learnable-blue mr-4">{icon}</div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{description}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onClick} className="w-full">
          Go to {title}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default Dashboard;
