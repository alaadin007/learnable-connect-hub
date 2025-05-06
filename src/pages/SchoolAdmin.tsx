
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
import { Users, BarChart2, ChevronDown, Settings, User, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentSchoolInfo } from "@/utils/databaseUtils";
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
  const [hasRedirected, setHasRedirected] = useState(false); // to prevent redirect loop
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log("Fetching school info...");
        
        // First try using the optimized function that combines multiple queries
        const schoolInfo = await getCurrentSchoolInfo();

        if (schoolInfo) {
          console.log("School info retrieved:", schoolInfo);
          setSchoolData({
            id: schoolInfo.id,
            name: schoolInfo.name,
            code: schoolInfo.code
          });
          setSchoolId(schoolInfo.id);
          setIsLoading(false);
          return;
        }

        // If getCurrentSchoolInfo failed, try direct fallback queries
        let schoolIdToUse = authSchoolId;

        if (!schoolIdToUse) {
          try {
            const { data: fetchedSchoolId, error: schoolIdError } = await supabase.rpc('get_user_school_id');

            if (schoolIdError) {
              console.error('Error fetching school ID:', schoolIdError);
              
              // Try teachers table directly
              const { data: authUser } = await supabase.auth.getUser();
              if (authUser?.user) {
                const { data: teacherData, error: teacherError } = await supabase
                  .from("teachers")
                  .select("school_id")
                  .eq("id", authUser.user.id)
                  .single();
                  
                if (teacherError || !teacherData) {
                  throw new Error("Failed to determine school ID");
                }
                schoolIdToUse = teacherData.school_id;
              } else {
                throw new Error("Not authenticated");
              }
            } else {
              schoolIdToUse = fetchedSchoolId;
            }
          } catch (e) {
            console.error("Error in school ID fallback:", e);
            throw new Error("Failed to determine school ID");
          }
        }

        if (schoolIdToUse) {
          console.log("Using school ID:", schoolIdToUse);
          setSchoolId(schoolIdToUse);

          const { data: schoolDetails, error: schoolError } = await supabase
            .from("schools")
            .select("name, code")
            .eq("id", schoolIdToUse)
            .single();

          if (schoolError) {
            console.error("Error fetching school details:", schoolError);
            setError("Failed to load school details. Please try again.");
          } else if (schoolDetails) {
            console.log("School details retrieved:", schoolDetails);
            setSchoolData({
              id: schoolIdToUse,
              name: schoolDetails.name,
              code: schoolDetails.code
            });
          }
        } else {
          setError("No school associated with your account.");
        }
      } catch (error) {
        console.error("Error fetching school information:", error);
        setError("Failed to load school information. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolInfo();
  }, [authSchoolId]);

  useEffect(() => {
    const fromTestAccounts = location.state?.fromTestAccounts === true;

    if (!fromTestAccounts && !isAdmin && userRole && !hasRedirected) {
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
      setHasRedirected(true);
    }
  }, [userRole, isAdmin, navigate, location.state, hasRedirected]);

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
          state: { fromNavigation: true },
          replace: true
        });
        break;
      default:
        break;
    }
  };

  const handleTabClick = (value: string) => {
    setActiveTab(value);
  };

  const handleRetry = () => {
    window.location.reload();
  };

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
                <CardTitle>School Admin Panel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 text-center">
                  <div className="mb-4 text-red-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Error Loading School Data</h3>
                  <p className="text-gray-600 mb-4">{error}</p>
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
