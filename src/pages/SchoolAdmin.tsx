import React, { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Users, BarChart2, ChevronDown, Settings, User, School } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalStudents: 0,
    activeClasses: 0,
    pendingInvitations: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Verify correct user role
  useEffect(() => {
    if (userRole && userRole !== "school") {
      navigate("/dashboard");
    }
  }, [userRole, navigate]);

  // Fetch school stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const schoolId = profile?.organization?.id;

        if (!schoolId) {
          toast.error("School ID not found");
          return;
        }

        // Fetch total teachers
        const { count: teacherCount, error: teacherError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('user_type', 'teacher');

        if (teacherError) throw teacherError;

        // Fetch total students
        const { count: studentCount, error: studentError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('user_type', 'student');

        if (studentError) throw studentError;

        // Fetch pending invitations
        const { count: invitationCount, error: invitationError } = await supabase
          .from('teacher_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('is_accepted', false);

        if (invitationError) throw invitationError;

        setStats({
          totalTeachers: teacherCount || 0,
          totalStudents: studentCount || 0,
          activeClasses: 0,
          pendingInvitations: invitationCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    if (profile?.organization?.id) {
      fetchStats();
    }
  }, [profile?.organization?.id]);

  // Handle tab selections
  const handleTabClick = (value: string) => {
    setActiveTab(value);
  };

  // Handle quick actions
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
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-xl">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">School Admin Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.full_name || 'Admin'}</p>
          </div>

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

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTeachers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStudents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeClasses}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingInvitations}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={handleTabClick} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="teachers">Teachers</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>School Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>Welcome to your school's dashboard. Here you can manage teachers, students, and school settings.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">School Information</h3>
                        <p className="text-sm text-gray-600">Name: {profile?.organization?.name || 'Not set'}</p>
                        <p className="text-sm text-gray-600">Code: {profile?.organization?.code || 'Not set'}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Quick Links</h3>
                        <div className="space-y-2">
                          <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickActionSelect("manage-teachers")}>
                            <Users className="mr-2 h-4 w-4" />
                            Manage Teachers
                          </Button>
                          <Button variant="outline" className="w-full justify-start" onClick={() => handleQuickActionSelect("student-management")}>
                            <User className="mr-2 h-4 w-4" />
                            Manage Students
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teachers">
              <Card>
                <CardHeader>
                  <CardTitle>Teacher Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>Manage your school's teachers and their permissions.</p>
                    <Button onClick={() => handleQuickActionSelect("manage-teachers")} className="w-full sm:w-auto">
                      <Users className="mr-2 h-4 w-4" />
                      Go to Teacher Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students">
              <Card>
                <CardHeader>
                  <CardTitle>Student Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>View and manage student records and progress.</p>
                    <Button onClick={() => handleQuickActionSelect("student-management")} className="w-full sm:w-auto">
                      <User className="mr-2 h-4 w-4" />
                      Go to Student Management
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>School Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>Configure your school's settings and preferences.</p>
                    <Button onClick={() => handleQuickActionSelect("school-settings")} className="w-full sm:w-auto">
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
