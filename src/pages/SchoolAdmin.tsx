
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, BarChart2, ChevronDown, Settings, User } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Define the extended type for teacher invitations to include error property
export type TeacherInvitation = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  school_id: string;
  invitation_token: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  error?: any; // Add optional error property to handle potential error values
};

const SchoolAdmin = () => {
  // We'll add a more robust error handling approach
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("teachers");
  const [isAuthError, setIsAuthError] = useState<boolean>(false);
  
  // Use a try-catch to prevent the app from crashing if auth context is undefined
  let auth;
  try {
    auth = useAuth();
    if (!auth) {
      console.error("Auth context is undefined");
      setIsAuthError(true);
    }
  } catch (error) {
    console.error("Error accessing auth context:", error);
    setIsAuthError(true);
  }
  
  const {
    profile,
    userRole,
    isLoading,
    isTestUser
  } = auth || {};
  
  // Debug school information
  useEffect(() => {
    if (profile) {
      console.log("SchoolAdmin - Profile loaded:", profile);
      console.log("School info:", profile.organization);
      console.log("User role:", userRole);
      console.log("Is test user:", isTestUser);
    }
  }, [profile, userRole, isTestUser]);
  
  // Handle auth error state with early return
  if (isAuthError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-xl">Authentication error</p>
            <p className="text-sm text-gray-600 mt-2">Unable to access authentication context</p>
            <Button 
              className="mt-4 bg-blue-600 hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            <Button 
              className="mt-2 ml-2"
              variant="outline"
              onClick={() => navigate("/login")}
            >
              Return to Login
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  
  // Use optional chaining for organization properties to avoid undefined errors
  const schoolId = profile?.organization?.id || null;
  const schoolName = profile?.organization?.name || "Not available";
  const schoolCode = profile?.organization?.code || "Not available";
  
  // Verify correct user role when auth is loaded
  useEffect(() => {
    if (!isLoading && userRole && userRole !== "school") {
      console.log(`SchoolAdmin: Redirecting user with role ${userRole} to dashboard`);
      navigate("/dashboard", { state: { fromRoleRedirect: true } });
    }
  }, [userRole, navigate, isLoading]);

  // Handle Quick actions dropdown
  const handleQuickActionSelect = (action: string) => {
    switch (action) {
      case "manage-teachers":
        navigate("/admin/teachers", { 
          state: { fromNavigation: true, preserveContext: true } 
        });
        break;
      case "view-analytics":
        navigate("/admin/analytics", { 
          state: { fromNavigation: true, preserveContext: true } 
        });
        break;
      case "school-settings":
        navigate("/admin/settings", { 
          state: { fromNavigation: true, preserveContext: true } 
        });
        break;
      case "student-management":
        navigate("/admin/students", { 
          state: { fromNavigation: true, preserveContext: true } 
        });
        break;
      case "dashboard":
        // Clear any previous state and set new state to prevent redirect loops
        navigate("/dashboard", { 
          state: { fromNavigation: true, preserveContext: true },
          replace: true
        });
        break;
      default:
        break;
    }
  };

  // Handle tab selections with consistency
  const handleTabClick = (value: string) => {
    setActiveTab(value);
    
    if (value === "students") {
      navigate("/admin/students", { 
        state: { fromNavigation: true, preserveContext: true }
      });
    } else if (value === "settings") {
      navigate("/admin/settings", { 
        state: { fromNavigation: true, preserveContext: true }
      });
    } else if (value === "teachers") {
      // Add handler for the teachers tab
      navigate("/admin/teachers", {
        state: { fromNavigation: true, preserveContext: true }
      });
    }
  };

  // Show loading state during authentication
  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8">
          <div className="container mx-auto px-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-xl">Verifying your admin access...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Add additional debug information when no organization is found
  if (!profile?.organization) {
    console.warn("No organization found in profile:", profile);
    
    // For test users, we need to ensure organization is set properly
    if (isTestUser) {
      console.log("Test user detected but missing organization");
    }
  }

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
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Your school details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Name:</span>
                  <span>{schoolName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <span className="font-mono">{schoolCode}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Your school code is used to invite teachers and students to join your school.
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
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
                    <Button 
                      onClick={() => navigate('/admin/students', { state: { fromNavigation: true, preserveContext: true } })} 
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
                      onClick={() => navigate('/admin/settings', { state: { fromNavigation: true, preserveContext: true } })} 
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolAdmin;
