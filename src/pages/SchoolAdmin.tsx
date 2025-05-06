
import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import StudentManagement from "@/components/teacher/StudentManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, BarChart2, ChevronDown, Settings, User, Copy, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentSchoolInfo } from "@/utils/databaseUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { profile, userRole, schoolId: authSchoolId } = useAuth();
  const { isAdmin } = useRBAC();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("teachers");
  const [schoolData, setSchoolData] = useState<{ name: string; code: string; id?: string } | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Define navigation handlers
  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchSchoolInfo();
  };

  const handleQuickActionSelect = (action: string) => {
    switch (action) {
      case "manage-teachers":
        navigate("/admin/teacher-management");
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
        navigate("/dashboard", {
          state: { fromNavigation: true }
        });
        break;
      default:
        break;
    }
  };

  const handleTabClick = (value: string) => {
    setActiveTab(value);
  };

  const fetchSchoolInfo = async () => {
    try {
      console.log("Fetching school info...");
      setIsLoading(true);
      setError(null);
      
      // First check if we have the data in the auth context
      if (profile?.organization?.id && profile?.organization?.name && profile?.organization?.code) {
        console.log("Found school info in profile:", profile.organization);
        setSchoolData({
          id: profile.organization.id,
          name: profile.organization.name,
          code: profile.organization.code
        });
        setSchoolId(profile.organization.id);
        setIsLoading(false);
        return;
      }

      // Try to get the school info using the utility function
      const schoolInfo = await getCurrentSchoolInfo();
      if (schoolInfo) {
        console.log("Retrieved school info from utility:", schoolInfo);
        setSchoolData({
          id: schoolInfo.school_id,
          name: schoolInfo.school_name,
          code: schoolInfo.school_code
        });
        setSchoolId(schoolInfo.school_id);
        setIsLoading(false);
        return;
      }
      
      // Get user metadata from auth as a fallback
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        throw new Error("Not authenticated");
      }
      
      // Try to extract school info from user metadata
      const userMeta = authData.user.user_metadata;
      console.log("User metadata:", userMeta);
      
      if (userMeta?.school_name && userMeta?.school_code) {
        console.log("Found school data in user metadata");
        
        // Get the school ID from the school code
        const { data: schoolInfo, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, code")
          .eq("code", userMeta.school_code)
          .single();
        
        if (!schoolError && schoolInfo) {
          console.log("Found school by code:", schoolInfo);
          setSchoolData({
            id: schoolInfo.id,
            name: schoolInfo.name,
            code: schoolInfo.code
          });
          setSchoolId(schoolInfo.id);
          setIsLoading(false);
          return;
        } else {
          console.error("Error finding school by code:", schoolError);
        }
      }
      
      // Direct query to the teachers table
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("school_id")
        .eq("id", authData.user.id)
        .single();
        
      if (!teacherError && teacherData?.school_id) {
        const schoolIdFromTeacher = teacherData.school_id;
        console.log("Found school ID in teachers table:", schoolIdFromTeacher);
        setSchoolId(schoolIdFromTeacher);
        
        // Now get the school details
        const { data: schoolDetails, error: schoolError } = await supabase
          .from("schools")
          .select("name, code")
          .eq("id", schoolIdFromTeacher)
          .single();
          
        if (!schoolError && schoolDetails) {
          console.log("Found school details:", schoolDetails);
          setSchoolData({
            id: schoolIdFromTeacher,
            name: schoolDetails.name,
            code: schoolDetails.code
          });
          setIsLoading(false);
          return;
        } else {
          console.error("Error finding school details:", schoolError);
        }
      } else {
        console.log("Could not find teacher record:", teacherError);
      }
      
      // If we still don't have school info, throw an error
      throw new Error("Could not determine school information");
      
    } catch (error: any) {
      console.error("Error fetching school information:", error);
      setError(error.message || "Failed to load school information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolInfo();
  }, [authSchoolId, profile]);  // Added profile as a dependency

  useEffect(() => {
    const fromTestAccounts = location.state?.fromTestAccounts === true;

    if (!fromTestAccounts && !isAdmin && userRole && !hasRedirected) {
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
      setHasRedirected(true);
    }
  }, [userRole, isAdmin, navigate, location.state, hasRedirected]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6">
              <Skeleton className="h-10 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>School Information</CardTitle>
                <CardDescription>Your school details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
            <div className="mt-8">
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8">
          <div className="container mx-auto px-4">
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span>Error Loading School Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center">
                  <div className="mb-4 text-red-500">
                    <AlertCircle className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">{error}</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't retrieve your school information. Please try again or contact support if the problem persists.
                  </p>
                  <Button onClick={handleRetry} className="gradient-bg">
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
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
                  <span>{schoolData?.name || profile?.organization?.name || "Not available"}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <span className="font-medium min-w-32">School Code:</span>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {schoolData?.code || profile?.organization?.code || "Not available"}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const code = schoolData?.code || profile?.organization?.code;
                        if (code) {
                          navigator.clipboard.writeText(code);
                          toast.success("School code copied to clipboard!");
                        }
                      }}
                      disabled={!schoolData?.code && !profile?.organization?.code}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
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
              {activeTab === "students" && (
                <StudentManagement
                  schoolId={schoolId}
                  isLoading={false}
                  schoolInfo={schoolData}
                />
              )}
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolAdmin;
