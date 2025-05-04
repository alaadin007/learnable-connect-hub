
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, BarChart3, Users, School, FileText, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";

const Dashboard = () => {
  const { user, profile, userRole, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [localLoading, setLocalLoading] = useState(true);

  // Set a timeout to prevent infinite loading state - shorten it for better UX
  useEffect(() => {
    console.log("Dashboard: Setting up timeout for loading state");
    const timer = setTimeout(() => {
      console.log("Dashboard: Timeout triggered, ending local loading state");
      setLocalLoading(false);
    }, 2000); // 2 seconds timeout instead of 3
    
    return () => clearTimeout(timer);
  }, []);

  // Redirect if not logged in, but only after loading completes
  useEffect(() => {
    console.log("Dashboard: Auth state check", { 
      isLoading, 
      localLoading,
      user: user ? "exists" : "null", 
      userRole, 
      locationState: location.state 
    });
    
    // Handle forced end of loading state
    if (!localLoading && isLoading) {
      console.log("Dashboard: Local loading ended before auth loading, still waiting for auth");
    }
    
    // Only make decisions when we have definitive auth state
    if (!isLoading) {
      console.log("Dashboard: Auth loading completed");
      setLocalLoading(false);
      
      // Handle bypassing login check for test accounts
      if (location.state?.fromTestAccounts || location.state?.preserveContext) {
        console.log("Dashboard: Bypassing login check due to navigation context");
        return;
      }
      
      // Handle unauthenticated users
      if (!user) {
        console.log("Dashboard: No user found, redirecting to login");
        navigate("/login");
      } else {
        console.log("Dashboard: User authenticated:", user.id);
      }
    }
  }, [user, navigate, location.state, isLoading, localLoading]);

  // More targeted approach to role-based redirection
  useEffect(() => {
    // Only redirect after loading completes and we have a valid user
    if (isLoading || !user) {
      return;
    }
    
    // Only redirect on specific conditions
    const isDirectDashboardAccess = !location.state?.fromNavigation && 
                                   !location.state?.fromTestAccounts &&
                                   !location.state?.preserveContext &&
                                   !location.state?.fromDashboard &&
                                   !location.state?.fromRoleRedirect;
    
    // Only redirect if we know the role and it's a direct access
    if (userRole && isDirectDashboardAccess) {
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
  }, [userRole, navigate, location.state, profile, isLoading, user]);

  // Show better loading state with more information
  if (isLoading || localLoading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl">Loading your dashboard...</p>
            {!isLoading && localLoading && (
              <p className="text-sm text-gray-500 mt-2">Finalizing authentication...</p>
            )}
            {localLoading && isLoading && (
              <p className="text-sm text-gray-500 mt-2">Verifying your credentials...</p>
            )}
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Show message when not authenticated and not from test accounts
  if (!user && !location.state?.fromTestAccounts) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4">You need to be logged in to access this page</p>
            <Button onClick={() => navigate("/login")}>Log In</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const renderUserDashboard = () => {
    const userType = profile?.user_type;

    if (userType === "school") {
      return (
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
      );
    }

    if (userType === "teacher") {
      return (
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
      );
    }

    // Default to student dashboard
    return (
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
