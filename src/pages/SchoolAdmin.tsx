import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import StudentInvitation from "@/components/school-admin/StudentInvitation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, BarChart2, ChevronDown, Settings, User, MessageSquare, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserSchoolId, getSchoolInfo } from "@/utils/schoolUtils";
import { School } from "@/components/analytics/types";

export type TeacherInvitation = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  school_id: string;
  invitation_token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
};

const SchoolAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("teachers");
  const { profile, userRole, user } = useAuth();
  
  const [schoolInfo, setSchoolInfo] = useState<School>({
    id: '',
    name: "Loading...",
    code: "Loading..."
  });
  
  // Fetch school info directly from the database
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        // First try to get from context/profile for immediate display
        if (profile?.organization?.name && profile?.organization?.code) {
          setSchoolInfo({
            id: profile.organization.id || '',
            name: profile.organization.name,
            code: profile.organization.code
          });
          return;
        }
        
        // Otherwise fetch from database
        const schoolId = await getCurrentUserSchoolId();
        
        if (schoolId) {
          const schoolData = await getSchoolInfo(schoolId);
          
          if (schoolData) {
            setSchoolInfo({
              id: schoolData.id,
              name: schoolData.name,
              code: schoolData.code
            });
          } else {
            setSchoolInfo({
              id: '',
              name: "Not available",
              code: "Not available"
            });
          }
        } else if (user?.user_metadata?.school_name && user?.user_metadata?.school_code) {
          // Fallback to user metadata
          setSchoolInfo({
            id: '',
            name: user.user_metadata.school_name,
            code: user.user_metadata.school_code
          });
        } else {
          setSchoolInfo({
            id: '',
            name: "Not available",
            code: "Not available"
          });
        }
      } catch (error) {
        console.error("Error fetching school info:", error);
        setSchoolInfo({
          id: '',
          name: "Not available",
          code: "Not available"
        });
      }
    };
    
    fetchSchoolInfo();
  }, [profile, user]);
  
  // Safety check for authentication
  useEffect(() => {
    if (!user) {
      toast.error("You must be logged in to access this page");
      navigate("/login", { state: { from: location.pathname } });
    }
  }, [user, navigate, location.pathname]);
  
  // Verify correct user role
  useEffect(() => {
    if (userRole && userRole !== "school") {
      console.log(`SchoolAdmin: Redirecting user with role ${userRole} to dashboard`);
      navigate("/dashboard", { state: { fromRoleRedirect: true } });
    }
  }, [userRole, navigate]);

  // Handle Quick actions dropdown
  const handleQuickActionSelect = (action: string) => {
    switch (action) {
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
      case "dashboard":
        navigate("/dashboard");
        break;
      case "chat":
        navigate("/chat");
        break;
      case "documents":
        navigate("/documents");
        break;
      default:
        break;
    }
  };

  // Handle tab selections with consistency
  const handleTabClick = (value: string) => {
    setActiveTab(value);
    
    if (value === "students") {
      navigate("/admin/students");
    } else if (value === "settings") {
      navigate("/admin/settings");
    } else if (value === "teachers") {
      navigate("/admin/teachers");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">School Admin Panel</h1>
            <p className="text-learnable-gray">
              Manage your school settings, teachers, and students
            </p>
          </div>
          
          {/* School Information Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Your school details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Name:</span>
                  <span>{schoolInfo.name}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <span className="font-mono">{schoolInfo.code}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your school code is used to invite teachers and students to join your school.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
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
                <DropdownMenuContent className="w-56 bg-white">
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("dashboard")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("manage-teachers")}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Manage Teachers</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("view-analytics")}>
                    <BarChart2 className="mr-2 h-4 w-4" />
                    <span>View Analytics</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("school-settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>School Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("student-management")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Student Management</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("chat")}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickActionSelect("documents")}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Documents</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Main Content Tabs */}
          <Tabs defaultValue="teachers" value={activeTab} onValueChange={handleTabClick} className="space-y-4">
            <TabsList className="w-full border-b">
              <TabsTrigger value="teachers" className="flex-1">
                Teachers
              </TabsTrigger>
              <TabsTrigger value="students" className="flex-1">
                Students
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                School Settings
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="teachers" className="space-y-4">
              <TeacherManagement />
            </TabsContent>
            
            <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Student Management</CardTitle>
                  <CardDescription>Manage students at your school</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <p className="text-muted-foreground mb-4">
                      Manage your school's students, including enrollment and class assignments.
                    </p>
                    <StudentInvitation />
                    <Button 
                      onClick={() => navigate('/admin/students')}
                      className="w-full sm:w-auto gradient-bg"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Go to Student Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>School Settings</CardTitle>
                  <CardDescription>Configure school-wide settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    <p className="text-muted-foreground mb-4">
                      Configure your school settings, including notification preferences and school details.
                    </p>
                    <Button 
                      onClick={() => navigate('/admin/settings')}
                      className="w-full sm:w-auto gradient-bg"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Go to School Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Additional Cards for Chat and Documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Chat with AI</CardTitle>
                <CardDescription>Get help from our AI learning assistant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground mb-4">
                    Get assistance with administrative tasks and educational questions.
                  </p>
                  <Button 
                    onClick={() => navigate('/chat')}
                    className="w-full sm:w-auto gradient-bg"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Go to Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload and manage learning materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground mb-4">
                    Manage and organize educational documents for your school.
                  </p>
                  <Button 
                    onClick={() => navigate('/documents')}
                    className="w-full sm:w-auto gradient-bg"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Go to Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolAdmin;
