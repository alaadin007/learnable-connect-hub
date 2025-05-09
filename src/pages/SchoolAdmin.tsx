import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/layout/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";

const SchoolAdmin = () => {
  const { user, profile, userRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-4">
          <h1 className="text-3xl font-bold mb-2">School Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage your school, teachers, and student performance analytics
          </p>
        </div>
        
        <AdminNavbar className="mb-8" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border overflow-hidden">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">Teacher Management</h3>
                <p className="text-sm text-gray-500 mb-1">Invite and manage teachers</p>
                <p className="text-gray-600">
                  Invite new teachers to your school and manage their accounts.
                </p>
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
                <p className="text-gray-600">
                  View student accounts, approval status, and access controls.
                </p>
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
                <p className="text-gray-600">
                  View usage analytics and performance metrics for your school.
                </p>
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
                <p className="text-gray-600">
                  Update school information, settings, and API configurations.
                </p>
                <Button 
                  onClick={() => navigate("/admin/settings", { state: { preserveContext: true } })} 
                  className="bg-amber-600 hover:bg-amber-700 w-full"
                >
                  School Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border overflow-hidden col-span-1 md:col-span-2">
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
