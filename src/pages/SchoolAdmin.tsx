
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
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Users, BarChart2, ChevronDown, Settings, User, School, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getCurrentSchoolInfo } from "@/utils/databaseUtils";

// Define the basic type for teacher invitations
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
  const [isLoading, setIsLoading] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  
  // Fetch school ID and data when component mounts
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        // Try to get complete school info from database
        const schoolInfo = await getCurrentSchoolInfo();
        
        if (schoolInfo) {
          setSchoolData({
            id: schoolInfo.id,
            name: schoolInfo.name,
            code: schoolInfo.code
          });
          setSchoolId(schoolInfo.id);
          return;
        }
        
        // Fallback: Try to get school ID from auth context
        let schoolIdToUse = authSchoolId;
        
        // If not available, fetch it
        if (!schoolIdToUse) {
          const { data: fetchedSchoolId, error: schoolIdError } = await supabase
            .rpc('get_user_school_id');
          
          if (schoolIdError) {
            console.error('Error fetching school ID:', schoolIdError);
            toast.error("Failed to load school information");
            return;
          }
          
          schoolIdToUse = fetchedSchoolId;
        }
        
        if (schoolIdToUse) {
          setSchoolId(schoolIdToUse);
          
          // Fetch school data
          const { data: schoolDetails, error: schoolError } = await supabase
            .from("schools")
            .select("name, code")
            .eq("id", schoolIdToUse)
            .single();
            
          if (schoolError) {
            console.error("Error fetching school details:", schoolError);
          } else if (schoolDetails) {
            setSchoolData({
              name: schoolDetails.name,
              code: schoolDetails.code
            });
          }
        }
      } catch (error) {
        console.error("Error fetching school information:", error);
        toast.error("Failed to load school information");
      }
    };
    
    fetchSchoolInfo();
  }, [authSchoolId]);
  
  // Verify correct user role, but only if not coming from test accounts
  useEffect(() => {
    const fromTestAccounts = location.state?.fromTestAccounts === true;
    
    if (!fromTestAccounts && !isAdmin && userRole) {
      toast.error("You don't have permission to access this page");
      navigate("/dashboard", { replace: true });
    }
  }, [userRole, isAdmin, navigate, location.state]);

  // Fixed Quick actions dropdown handler to prevent navigation issues
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
        // Clear any previous state and set new state to prevent redirect loops
        navigate("/dashboard", { 
          state: { fromNavigation: true },
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
      navigate("/admin/students");
    } else if (value === "settings") {
      navigate("/admin/settings");
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
