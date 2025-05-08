
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart, Settings, UserPlus, School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/layout/Footer";

const SchoolAdmin = () => {
  const { user, profile, userRole, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  // Verify this user should be on this page
  useEffect(() => {
    // If we can't determine user role, try to refresh profile data
    if (user && !userRole) {
      console.log("SchoolAdmin: No user role detected, refreshing profile");
      refreshProfile();
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
  }, [user, userRole, navigate, refreshProfile]);

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
            <CardHeader>
              <CardTitle>Teacher Management</CardTitle>
              <CardDescription>Invite and manage teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start mb-4">
                <div className="text-blue-600 mr-4">
                  <UserPlus className="h-8 w-8" />
                </div>
                <div>
                  <p className="mb-4">Invite new teachers to your school and manage their accounts.</p>
                  <Button 
                    onClick={() => navigate("/admin/teacher-management")} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Manage Teachers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>View and manage students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start mb-4">
                <div className="text-green-600 mr-4">
                  <Users className="h-8 w-8" />
                </div>
                <div>
                  <p className="mb-4">View student accounts, approval status, and access controls.</p>
                  <Button 
                    onClick={() => navigate("/admin/students")} 
                    className="bg-green-600 hover:bg-green-700"
                  >
                    View Students
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>Track performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start mb-4">
                <div className="text-purple-600 mr-4">
                  <BarChart className="h-8 w-8" />
                </div>
                <div>
                  <p className="mb-4">View usage analytics and performance metrics for your school.</p>
                  <Button 
                    onClick={() => navigate("/admin/analytics")} 
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    View Analytics
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>School Settings</CardTitle>
              <CardDescription>Configure school options</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start mb-4">
                <div className="text-amber-600 mr-4">
                  <Settings className="h-8 w-8" />
                </div>
                <div>
                  <p className="mb-4">Update school information, settings, and API configurations.</p>
                  <Button 
                    onClick={() => navigate("/admin/settings")} 
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    School Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle>School Profile</CardTitle>
              <CardDescription>School information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start mb-4">
                <div className="text-indigo-600 mr-4">
                  <School className="h-8 w-8" />
                </div>
                <div>
                  <p className="mb-4">
                    <strong>School: </strong>{profile?.organization?.name || profile?.school_name || "Your School"}<br />
                    <strong>Code: </strong>{profile?.organization?.code || profile?.school_code || "N/A"}<br />
                    <strong>Admin: </strong>{profile?.full_name || user?.email}
                  </p>
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
