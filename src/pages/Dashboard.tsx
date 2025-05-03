import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, BarChart3, Users, School, FileText, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";

const Dashboard = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);
  
  // Only redirect school and teacher users if they're directly accessing dashboard
  // with no fromNavigation state, to avoid navigation loops from test accounts
  useEffect(() => {
    // Only redirect on the initial /dashboard load, not when explicitly navigating to /dashboard
    if (location.pathname === "/dashboard" && userRole && !location.state?.fromNavigation && !location.state?.fromDashboard) {
      // Only redirect school and teacher accounts, leave students at dashboard
      if (userRole === "school" && profile?.organization?.id) {
        console.log("Dashboard: Redirecting school admin to /admin");
        navigate("/admin", { replace: true, state: { fromDashboard: true } });
      } else if (userRole === "teacher") {
        console.log("Dashboard: Redirecting teacher to /teacher/analytics");
        navigate("/teacher/analytics", { replace: true, state: { fromDashboard: true } });
      }
    }
  }, [userRole, navigate, location.pathname, profile, location.state]);

  // Return a loading state if profile isn't loaded yet
  if (!user || !profile) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-6">Loading...</h1>
        </div>
      </div>
    );
  }

  const renderUserDashboard = () => {
    // Check user type and render appropriate dashboard
    const userType = profile.user_type;

    // School Admin Dashboard
    if (userType === "school") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="School Admin"
            description="Manage your school settings and configurations"
            icon={<School className="h-10 w-10" />}
            onClick={() => navigate("/admin", { state: { fromNavigation: true } })}
          />
          <DashboardCard
            title="Teacher Management"
            description="Add, remove, and manage teacher accounts"
            icon={<Users className="h-10 w-10" />}
            onClick={() => navigate("/admin/teacher-management")}
          />
          <DashboardCard
            title="Analytics"
            description="View school-wide performance analytics"
            icon={<BarChart3 className="h-10 w-10" />}
            onClick={() => navigate("/admin/analytics")}
          />
          <DashboardCard
            title="Chat with AI"
            description="Get help from our AI learning assistant"
            icon={<MessageSquare className="h-10 w-10" />}
            onClick={() => navigate("/chat")}
          />
        </div>
      );
    }

    // Teacher Dashboard
    if (userType === "teacher") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Student Management"
            description="Manage your students and classes"
            icon={<Users className="h-10 w-10" />}
            onClick={() => navigate("/teacher/students")}
          />
          <DashboardCard
            title="Analytics"
            description="View student performance analytics"
            icon={<BarChart3 className="h-10 w-10" />}
            onClick={() => navigate("/teacher/analytics")}
          />
          <DashboardCard
            title="Chat with AI"
            description="Get help from our AI learning assistant"
            icon={<MessageSquare className="h-10 w-10" />}
            onClick={() => navigate("/chat")}
          />
        </div>
      );
    }

    // Student Dashboard (default)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Chat with AI"
          description="Get help with your studies from our AI learning assistant"
          icon={<MessageSquare className="h-10 w-10" />}
          onClick={() => navigate("/chat")}
        />
        <DashboardCard
          title="Assessments"
          description="View and complete your assigned assessments"
          icon={<FileText className="h-10 w-10" />}
          onClick={() => navigate("/student/assessments")}
        />
        <DashboardCard
          title="My Progress"
          description="Track your performance and learning progress"
          icon={<BarChart3 className="h-10 w-10" />}
          onClick={() => navigate("/student/progress")}
        />
        <DashboardCard
          title="Settings"
          description="Manage your profile and preferences"
          icon={<Settings className="h-10 w-10" />}
          onClick={() => navigate("/student/settings")}
        />
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {profile.full_name}</h1>
          <p className="text-gray-600">
            {profile.user_type === "school"
              ? "Manage your school, teachers, and view analytics"
              : profile.user_type === "teacher"
              ? "Manage your students and view their progress"
              : "Access your learning resources and complete your assessments"}
          </p>
          {profile.user_type === "student" && profile.organization && (
            <p className="text-sm text-gray-500 mt-2">
              School: {profile.organization.name}
            </p>
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

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  onClick,
}) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
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
