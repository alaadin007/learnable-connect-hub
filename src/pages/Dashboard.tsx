
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, BarChart3, Users, School, FileText, Settings, 
  ChevronDown, User, Calendar, CheckCircle, Bell, Book
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
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock Data for Test Accounts
const MOCK_DATA = {
  school: {
    name: "Test School",
    code: "TEST123",
    full_name: "Test School Admin",
    organization: {
      id: "test-school-id",
      name: "Test School",
      code: "TEST123"
    }
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
  const { userRole, profile, isTestUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine data source: real profile or mock
  const currentProfile = isTestUser && MOCK_DATA[userRole] ? MOCK_DATA[userRole] : profile;

  useEffect(() => {
    // Check authentication status
    if (!user) {
      toast.error("You must be logged in to view this page");
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [user, navigate, location.pathname]);

  if (!currentProfile) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center p-4">
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

  // Redirect to role-specific dashboard
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
              ? "Access all your teaching tools and resources in one place"
              : "Access your learning resources and track your progress"}
          </p>
          {userRole === "student" && currentProfile.organization && (
            <p className="text-sm text-gray-500 mt-2">
              School: {currentProfile.organization.name}
            </p>
          )}
        </div>
        
        {userRole === "teacher" ? <TeacherDashboard /> : <StudentDashboard />}
      </main>
      <Footer />
    </>
  );
};

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("classes");

  return (
    <>
      <Tabs defaultValue="classes" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full bg-muted">
          <TabsTrigger value="classes" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" /> 
            Classes & Schedule
          </TabsTrigger>
          <TabsTrigger value="students" className="flex-1">
            <Users className="h-4 w-4 mr-2" /> 
            Students
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex-1">
            <Book className="h-4 w-4 mr-2" /> 
            Resources
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="classes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Today's Schedule</CardTitle>
                <CardDescription>Your classes for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between p-2 bg-blue-50 rounded">
                    <div>
                      <p className="font-medium">Mathematics - Grade 10A</p>
                      <p className="text-sm text-gray-500">Room 302</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-600">8:30 - 9:30 AM</p>
                      <p className="text-sm text-gray-500">25 students</p>
                    </div>
                  </div>
                  <div className="flex justify-between p-2 rounded">
                    <div>
                      <p className="font-medium">Physics - Grade 11B</p>
                      <p className="text-sm text-gray-500">Lab 2</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-600">10:00 - 11:30 AM</p>
                      <p className="text-sm text-gray-500">22 students</p>
                    </div>
                  </div>
                  <div className="flex justify-between p-2 rounded">
                    <div>
                      <p className="font-medium">Mathematics - Grade 9C</p>
                      <p className="text-sm text-gray-500">Room 301</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-600">1:00 - 2:00 PM</p>
                      <p className="text-sm text-gray-500">28 students</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate("/teacher/schedule")}>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Full Schedule
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Pending Tasks</CardTitle>
                <CardDescription>Assignments that need attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between p-2 bg-amber-50 rounded">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-amber-500 mr-2" />
                      <div>
                        <p className="font-medium">Grade Math Quiz #3</p>
                        <p className="text-sm text-gray-500">Grade 10A - 25 submissions</p>
                      </div>
                    </div>
                    <p className="text-sm text-amber-600 font-medium">Due today</p>
                  </div>
                  <div className="flex justify-between p-2 bg-red-50 rounded">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-red-500 mr-2" />
                      <div>
                        <p className="font-medium">Grade Physics Lab Report</p>
                        <p className="text-sm text-gray-500">Grade 11B - 20 submissions</p>
                      </div>
                    </div>
                    <p className="text-sm text-red-600 font-medium">Overdue</p>
                  </div>
                  <div className="flex justify-between p-2 rounded">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">Create Final Exam</p>
                        <p className="text-sm text-gray-500">Grade 9C</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">Due in 5 days</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => navigate("/teacher/tasks")}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  View All Tasks
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardCard
              title="Create Assignment"
              description="Create and assign new work to your classes"
              icon={<FileText className="h-6 w-6" />}
              onClick={() => navigate("/teacher/create-assignment")}
            />
            <DashboardCard
              title="Take Attendance"
              description="Mark attendance for today's classes"
              icon={<Users className="h-6 w-6" />}
              onClick={() => navigate("/teacher/attendance")}
            />
            <DashboardCard
              title="Class Analytics"
              description="View performance data for your classes"
              icon={<BarChart3 className="h-6 w-6" />}
              onClick={() => navigate("/teacher-analytics")}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="students" className="space-y-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>View and manage your students</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Access complete student lists, manage grades, and track academic progress.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DashboardCard
                  title="Student Directory"
                  description="View and manage all your students"
                  icon={<Users className="h-6 w-6" />}
                  onClick={() => navigate("/teacher/students")}
                />
                <DashboardCard
                  title="Student Analytics"
                  description="Track student performance and progress"
                  icon={<BarChart3 className="h-6 w-6" />}
                  onClick={() => navigate("/teacher-analytics")}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Communication Center</CardTitle>
              <CardDescription>Connect with students and parents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Send messages, share updates, and schedule meetings with students and parents.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DashboardCard
                  title="Send Messages"
                  description="Communicate with students and parents"
                  icon={<MessageSquare className="h-6 w-6" />}
                  onClick={() => navigate("/teacher/messages")}
                />
                <DashboardCard
                  title="Announcements"
                  description="Create and post class announcements"
                  icon={<Bell className="h-6 w-6" />}
                  onClick={() => navigate("/teacher/announcements")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardCard
              title="Document Library"
              description="Access and manage teaching materials"
              icon={<FileText className="h-6 w-6" />}
              onClick={() => navigate("/documents")}
            />
            <DashboardCard
              title="Chat with AI"
              description="Get help with lesson planning and resources"
              icon={<MessageSquare className="h-6 w-6" />}
              onClick={() => navigate("/chat")}
            />
            <DashboardCard
              title="Settings"
              description="Manage your profile and preferences"
              icon={<Settings className="h-6 w-6" />}
              onClick={() => navigate("/teacher/settings")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState("schedule");

  return (
    <>
      <Tabs defaultValue="schedule" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full bg-muted">
          <TabsTrigger value="schedule" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" /> 
            Schedule
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex-1">
            <FileText className="h-4 w-4 mr-2" /> 
            Assignments
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex-1">
            <BarChart3 className="h-4 w-4 mr-2" /> 
            My Progress
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="schedule" className="space-y-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Today's Classes</CardTitle>
              <CardDescription>Your schedule for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between p-2 bg-blue-50 rounded">
                  <div>
                    <p className="font-medium">Mathematics</p>
                    <p className="text-sm text-gray-500">Room 302 - Mr. Johnson</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">8:30 - 9:30 AM</p>
                    <p className="text-sm text-gray-500">Current class</p>
                  </div>
                </div>
                <div className="flex justify-between p-2 rounded">
                  <div>
                    <p className="font-medium">English Literature</p>
                    <p className="text-sm text-gray-500">Room 203 - Ms. Smith</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">10:00 - 11:30 AM</p>
                  </div>
                </div>
                <div className="flex justify-between p-2 rounded">
                  <div>
                    <p className="font-medium">Biology</p>
                    <p className="text-sm text-gray-500">Lab 1 - Dr. Brown</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600">1:00 - 2:30 PM</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate("/student/schedule")}>
                View Full Schedule
              </Button>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DashboardCard
              title="Weekly Schedule"
              description="View your full weekly class schedule"
              icon={<Calendar className="h-6 w-6" />}
              onClick={() => navigate("/student/schedule")}
            />
            <DashboardCard
              title="Chat with AI"
              description="Get help with your studies from our AI assistant"
              icon={<MessageSquare className="h-6 w-6" />}
              onClick={() => navigate("/chat")}
            />
            <DashboardCard
              title="Documents"
              description="Access your learning materials"
              icon={<FileText className="h-6 w-6" />}
              onClick={() => navigate("/documents")}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="assignments" className="space-y-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Upcoming Assignments</CardTitle>
              <CardDescription>Work that needs to be completed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between p-2 bg-amber-50 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-amber-500 mr-2" />
                    <div>
                      <p className="font-medium">Math Problem Set #5</p>
                      <p className="text-sm text-gray-500">Mathematics - Mr. Johnson</p>
                    </div>
                  </div>
                  <p className="text-sm text-amber-600 font-medium">Due today</p>
                </div>
                <div className="flex justify-between p-2 bg-red-50 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-red-500 mr-2" />
                    <div>
                      <p className="font-medium">Essay: Literary Analysis</p>
                      <p className="text-sm text-gray-500">English Literature - Ms. Smith</p>
                    </div>
                  </div>
                  <p className="text-sm text-red-600 font-medium">Overdue</p>
                </div>
                <div className="flex justify-between p-2 rounded">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="font-medium">Lab Report: Cell Division</p>
                      <p className="text-sm text-gray-500">Biology - Dr. Brown</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">Due in 3 days</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate("/student/assessments")}>
                View All Assignments
              </Button>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DashboardCard
              title="All Assessments"
              description="View and complete your assigned assessments"
              icon={<FileText className="h-6 w-6" />}
              onClick={() => navigate("/student/assessments")}
            />
            <DashboardCard
              title="Completed Work"
              description="View your submitted assignments and grades"
              icon={<CheckCircle className="h-6 w-6" />}
              onClick={() => navigate("/student/completed")}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="progress" className="space-y-4">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Academic Progress</CardTitle>
              <CardDescription>Your current academic standing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium">Overall GPA</p>
                  <p className="text-xl font-bold text-blue-600">3.85</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-500">Mathematics</p>
                    <p className="text-lg font-semibold text-blue-600">A (95%)</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-500">English Literature</p>
                    <p className="text-lg font-semibold text-blue-600">A- (92%)</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-500">Biology</p>
                    <p className="text-lg font-semibold text-blue-600">B+ (88%)</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm font-medium text-gray-500">History</p>
                    <p className="text-lg font-semibold text-blue-600">A (96%)</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate("/student/progress")}>
                View Detailed Progress
              </Button>
            </CardFooter>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            <DashboardCard
              title="My Progress"
              description="Track your performance and learning progress"
              icon={<BarChart3 className="h-6 w-6" />}
              onClick={() => navigate("/student/progress")}
            />
            <DashboardCard
              title="Settings"
              description="Manage your profile and preferences"
              icon={<Settings className="h-6 w-6" />}
              onClick={() => navigate("/student/settings")}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

const SchoolAdminDashboard: React.FC<{ profile: any }> = ({ profile }) => {
  const navigate = useNavigate();

  const handleQuickActionSelect = (action: string) => {
    switch(action) {
      case "manage-teachers":
        navigate("/admin/teachers");
        break;
      case "view-analytics":
        navigate("/admin/analytics");
        break;
      case "school-settings":
        navigate("/admin/settings");
        break;
      case "student-management":
        navigate("/admin/students");
        break;
      case "chat":
        navigate("/chat");
        break;
      case "documents":
        navigate("/documents");
        break;
      case "dashboard":
        navigate("/dashboard");
        break;
      default:
        break;
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
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("dashboard")}>
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
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
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("chat")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("documents")}>
                    <FileText className="mr-2 h-4 w-4" />
                    Documents
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
              onClick={() => navigate("/admin/teachers")}
            />
            <DashboardCard
              title="Analytics"
              description="View school-wide performance analytics"
              icon={<BarChart3 className="h-10 w-10" />}
              onClick={() => navigate("/admin/analytics")}
            />
            <DashboardCard
              title="School Settings"
              description="Configure your school settings and details"
              icon={<Settings className="h-10 w-10" />}
              onClick={() => navigate("/admin/settings")}
            />
            <DashboardCard
              title="Student Management"
              description="Manage students at your school"
              icon={<User className="h-10 w-10" />}
              onClick={() => navigate("/admin/students")}
            />
            <DashboardCard
              title="Chat with AI"
              description="Get help from our AI learning assistant"
              icon={<MessageSquare className="h-10 w-10" />}
              onClick={() => navigate("/chat")}
            />
            <DashboardCard
              title="Documents"
              description="Upload and manage learning materials"
              icon={<FileText className="h-10 w-10" />}
              onClick={() => navigate("/documents")}
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
