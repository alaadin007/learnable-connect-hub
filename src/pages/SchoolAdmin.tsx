
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart, Settings, UserPlus, School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/layout/Footer";

const SchoolAdmin = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Don't add useEffect to check user role here - that's handled by ProtectedRoute
  // This prevents redirect loops and unnecessary checks

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
          <Card className="border overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">Teacher Management</h3>
                <p className="text-sm text-gray-500 mb-1">Invite and manage teachers</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-blue-600">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <p className="text-gray-600">
                    Invite new teachers to your school and manage their accounts.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/admin/teacher-management", { state: { preserveContext: true } })} 
                  className="bg-blue-600 hover:bg-blue-700 w-full"
                >
                  Manage Teachers
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">Student Management</h3>
                <p className="text-sm text-gray-500 mb-1">View and manage students</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-green-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <p className="text-gray-600">
                    View student accounts, approval status, and access controls.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/admin/students", { state: { preserveContext: true } })} 
                  className="bg-green-600 hover:bg-green-700 w-full"
                >
                  View Students
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">Analytics Dashboard</h3>
                <p className="text-sm text-gray-500 mb-1">Track performance metrics</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-purple-600">
                    <BarChart className="h-6 w-6" />
                  </div>
                  <p className="text-gray-600">
                    View usage analytics and performance metrics for your school.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/admin/analytics", { state: { preserveContext: true } })} 
                  className="bg-purple-600 hover:bg-purple-700 w-full"
                >
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">School Settings</h3>
                <p className="text-sm text-gray-500 mb-1">Configure school options</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-amber-600">
                    <Settings className="h-6 w-6" />
                  </div>
                  <p className="text-gray-600">
                    Update school information, settings, and API configurations.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate("/admin/settings", { state: { preserveContext: true } })} 
                  className="bg-amber-600 hover:bg-amber-700 w-full"
                >
                  School Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">School Profile</h3>
                <p className="text-sm text-gray-500 mb-1">School information</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-indigo-600">
                    <School className="h-6 w-6" />
                  </div>
                  <div>
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
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SchoolAdmin;
