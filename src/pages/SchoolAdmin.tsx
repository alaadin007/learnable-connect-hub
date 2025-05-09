
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart, Settings, UserPlus, School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";

const SchoolAdmin = () => {
  const { user, profile, userRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    console.log("SchoolAdmin: Component mounting with user data:", {
      userId: user?.id,
      email: user?.email,
      role: userRole,
      profile,
      fromTestAccounts: location.state?.fromTestAccounts
    });
    
    // Set a maximum loading time
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    return () => clearTimeout(loadingTimeout);
  }, []);
  
  // Verify this user should be on this page
  useEffect(() => {
    const checkAccess = async () => {
      // Special case: If coming from test accounts, we always allow
      if (location.state?.fromTestAccounts && location.state?.accountType === "school") {
        console.log("SchoolAdmin: Access granted via test accounts");
        setIsLoading(false);
        return;
      }
      
      // If we can't determine user role, try to refresh profile data
      if (user && !userRole) {
        console.log("SchoolAdmin: No user role detected, refreshing profile");
        try {
          await refreshProfile();
        } catch (e) {
          console.error("SchoolAdmin: Error refreshing profile:", e);
        }
      }
      
      // Check if user exists
      if (!user) {
        console.log("SchoolAdmin: No authenticated user, redirecting to login");
        navigate("/login");
        return;
      }
      
      // Test account logic - if email is a test school account, allow access
      if (user.email?.includes("school.test@") || user.id?.startsWith("test-school")) {
        console.log("SchoolAdmin: Test school account detected, granting access");
        setIsLoading(false);
        return;
      }
      
      // If we know the user isn't a school admin, redirect
      if (userRole && userRole !== "school" && userRole !== "school_admin") {
        console.log(`SchoolAdmin: User role ${userRole} is not admin, redirecting`);
        
        // Redirect based on role
        if (userRole === "teacher") {
          navigate("/teacher/analytics");
        } else {
          navigate("/dashboard");
        }
      }
      
      setIsLoading(false);
    };
    
    checkAccess();
  }, [user, userRole, navigate, refreshProfile, location.state]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl mb-4">Loading admin dashboard...</p>
            <div className="w-16 h-1 bg-blue-600 animate-pulse mx-auto"></div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">School Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage your school, teachers, and student performance analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-blue-600 mr-4">
                    <UserPlus className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Teacher Management</h3>
                    <p className="text-sm text-gray-500 mb-1">Invite and manage teachers</p>
                    <p className="mb-4">Invite new teachers to your school and manage their accounts.</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/admin/teacher-management")} 
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  Manage Teachers
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-green-600 mr-4">
                    <Users className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Student Management</h3>
                    <p className="text-sm text-gray-500 mb-1">View and manage students</p>
                    <p className="mb-4">View student accounts, approval status, and access controls.</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/admin/students")} 
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  View Students
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-purple-600 mr-4">
                    <BarChart className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Analytics Dashboard</h3>
                    <p className="text-sm text-gray-500 mb-1">Track performance metrics</p>
                    <p className="mb-4">View usage analytics and performance metrics for your school.</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/admin/analytics")} 
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-amber-600 mr-4">
                    <Settings className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">School Settings</h3>
                    <p className="text-sm text-gray-500 mb-1">Configure school options</p>
                    <p className="mb-4">Update school information, settings, and API configurations.</p>
                  </div>
                </div>
                <Button 
                  onClick={() => navigate("/admin/settings")} 
                  className="bg-amber-600 hover:bg-amber-700 w-full"
                >
                  School Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6 pb-6">
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="text-indigo-600 mr-4">
                    <School className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">School Profile</h3>
                    <p className="text-sm text-gray-500 mb-1">School information</p>
                    <div className="mb-4">
                      <p>
                        <strong>School: </strong>{profile?.organization?.name || profile?.school_name || "Your School"}
                      </p>
                      <p>
                        <strong>Admin: </strong>{profile?.full_name || user?.email}
                      </p>
                      {profile?.organization?.code && (
                        <p className="mt-2">
                          <strong>School Code: </strong>
                          <code className="bg-gray-100 px-2 py-1 rounded text-indigo-600 font-mono">
                            {profile.organization.code}
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SchoolAdmin;
