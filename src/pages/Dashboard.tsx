import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, BarChart3, Users, School, FileText, Settings, 
  ChevronDown, User 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Mock Data for Test Accounts
const MOCK_DATA = {
  school: {
    name: "Test School",
    code: "TEST123",
    full_name: "Test School Admin",
  },
  teacher: {
    full_name: "Test Teacher",
  },
  student: {
    full_name: "Test Student",
    organization: {
      name: "Test School",
    }
  }
};

const Dashboard = () => {
  const { userRole, profile, isTestUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Show loading state, but with a short timeout to avoid flashing
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Determine data source: real profile or mock
  const currentProfile = isTestUser && MOCK_DATA[userRole] ? MOCK_DATA[userRole] : profile;

  if (!currentProfile) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 text-lg">User profile not available. Please log in again.</p>
            <Button onClick={() => navigate("/login")} className="mt-4">
              Go to Login
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Same conditional rendering of dashboards by role
  if (userRole === "school") {
    return <SchoolAdminDashboard profile={currentProfile} />;
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, {currentProfile.full_name || "User"}
          </h1>
          <p className="text-gray-600">
            {userRole === "teacher"
              ? "Manage your students and view their progress"
              : "Access your learning resources and complete your assessments"}
          </p>
          {userRole === "student" && currentProfile.organization && (
            <p className="text-sm text-gray-500 mt-2">
              School: {currentProfile.organization.name}
            </p>
          )}
        </div>
        {renderUserDashboard()}
      </main>
      <Footer />
    </>
  );

  function renderUserDashboard() {
    if (userRole === "teacher") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Student Management"
            description="Manage your students and classes"
            icon={<Users className="h-10 w-10" />}
            onClick={() =>
              navigate("/teacher/students", {
                state: { fromNavigation: true },
              })
            }
          />
          <DashboardCard
            title="Analytics"
            description="View student performance analytics"
            icon={<BarChart3 className="h-10 w-10" />}
            onClick={() =>
              navigate("/teacher/analytics", {
                state: { fromNavigation: true },
              })
            }
          />
          <DashboardCard
            title="Chat with AI"
            description="Get help from our AI learning assistant"
            icon={<MessageSquare className="h-10 w-10" />}
            onClick={() =>
              navigate("/chat", {
                state: { fromNavigation: true },
              })
            }
          />
        </div>
      );
    }
    // Student dashboard
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          title="Chat with AI"
          description="Get help with your studies from our AI learning assistant"
          icon={<MessageSquare className="h-10 w-10" />}
          onClick={() =>
            navigate("/chat", {
              state: { fromNavigation: true },
            })
          }
        />
        <DashboardCard
          title="Assessments"
          description="View and complete your assigned assessments"
          icon={<FileText className="h-10 w-10" />}
          onClick={() =>
            navigate("/student/assessments", {
              state: { fromNavigation: true },
            })
          }
        />
        <DashboardCard
          title="My Progress"
          description="Track your performance and learning progress"
          icon={<BarChart3 className="h-10 w-10" />}
          onClick={() =>
            navigate("/student/progress", {
              state: { fromNavigation: true },
            })
          }
        />
        <DashboardCard
          title="Settings"
          description="Manage your profile and preferences"
          icon={<Settings className="h-10 w-10" />}
          onClick={() =>
            navigate("/student/settings", {
              state: { fromNavigation: true },
            })
          }
        />
      </div>
    );
  }
};

const SchoolAdminDashboard: React.FC<{ profile: any }> = ({ profile }) => {
  const navigate = useNavigate();

  const handleQuickActionSelect = (action: string) => {
    const routes: Record<string, string> = {
      "manage-teachers": "/admin/teacher-management",
      "view-analytics": "/admin/analytics",
      "school-settings": "/admin/settings",
      "student-management": "/admin/students",
    };
    if (routes[action]) {
      navigate(routes[action], { state: { fromNavigation: true } });
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">School Admin Panel</h1>
            <p className="text-learnable-gray">
              Manage your school settings, teachers, and students
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Your school details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Name:</span>
                  <span>{profile.organization?.name ?? "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <span className="font-mono">{profile.organization?.code ?? "Not available"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your school code is used to invite teachers and students.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mb-6 flex flex-wrap gap-3 justify-between items-center">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Quick Actions
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" >
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("manage-teachers")}>
                    <Users className="mr-2 h-4 w-4" />
                    Manage Teachers
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("view-analytics")}>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("school-settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    School Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("student-management")}>
                    <User className="mr-2 h-4 w-4" />
                    Student Management
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <DashboardCard
              title="Teacher Management"
              description="Add, remove, and manage teacher accounts"
              icon={<Users className="h-10 w-10" />}
              onClick={() => navigate("/admin/teacher-management", { state: { fromNavigation: true } })}
            />
            <DashboardCard
              title="Analytics"
              description="View school-wide performance analytics"
              icon={<BarChart3 className="h-10 w-10" />}
              onClick={() => navigate("/admin/analytics", { state: { fromNavigation: true } })}
            />
            <DashboardCard
              title="School Settings"
              description="Configure your school settings and details"
              icon={<Settings className="h-10 w-10" />}
              onClick={() => navigate("/admin/settings", { state: { fromNavigation: true } })}
            />
            <DashboardCard
              title="Student Management"
              description="Manage students at your school"
              icon={<User className="h-10 w-10" />}
              onClick={() => navigate("/admin/students", { state: { fromNavigation: true } })}
            />
            <DashboardCard
              title="Chat with AI"
              description="Get help from our AI learning assistant"
              icon={<MessageSquare className="h-10 w-10" />}
              onClick={() => navigate("/chat", { state: { fromNavigation: true } })}
            />
          </div>
        </div>
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
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Go to ${title}`}
      onKeyDown={onKeyDown}
    >
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
