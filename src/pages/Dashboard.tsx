
import React from "react";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, BarChart3, Users, School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Footer from "@/components/layout/Footer";

const Dashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

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
            onClick={() => navigate("/admin")}
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
          <DashboardCard
            title="Learning Materials"
            description="Upload and manage learning materials"
            icon={<BookOpen className="h-10 w-10" />}
            onClick={() => navigate("/documents")}
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
          <DashboardCard
            title="Learning Materials"
            description="Upload and manage learning materials"
            icon={<BookOpen className="h-10 w-10" />}
            onClick={() => navigate("/documents")}
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
          title="Learning Materials"
          description="Upload and manage your learning materials"
          icon={<BookOpen className="h-10 w-10" />}
          onClick={() => navigate("/documents")}
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
              : "Access your learning resources and get help from our AI"}
          </p>
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
