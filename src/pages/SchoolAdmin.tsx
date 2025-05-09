import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/landing/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import SchoolCodeManager from "@/components/school-admin/SchoolCodeManager";
import { supabase } from "@/integrations/supabase/client";

const SchoolAdmin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [currentCode, setCurrentCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the current school code on component mount
  useEffect(() => {
    const fetchSchoolCode = async () => {
      if (!profile?.organization?.id) return;

      try {
        const { data, error } = await supabase
          .from("schools")
          .select("code")
          .eq("id", profile.organization.id)
          .single();

        if (error) throw error;

        if (data && data.code) {
          setCurrentCode(data.code);
        }
      } catch (error) {
        console.error("Error fetching school code:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolCode();
  }, [profile?.organization?.id]);

  // Handle code generation callback
  const handleCodeGenerated = (code: string) => {
    setCurrentCode(code);
  };

  const schoolId = profile?.organization?.id || profile?.school_id || "";

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* School Code Manager */}
          <Card className="md:col-span-1">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">School Invitation Code</h3>
              <p className="text-gray-600 mb-4">
                Generate and share this code for teachers and students to join your school
              </p>
              {schoolId && (
                <SchoolCodeManager
                  schoolId={schoolId}
                  currentCode={currentCode}
                  onCodeGenerated={handleCodeGenerated}
                />
              )}
            </CardContent>
          </Card>

          {/* School Profile Card */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="space-y-4">
                <h3 className="text-xl font-bold mb-1">School Profile</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-indigo-600">
                    <School className="h-6 w-6" />
                  </div>
                  <div>
                    <p>
                      <strong>School: </strong>
                      {profile?.organization?.name || profile?.school_name || "Your School"}
                    </p>
                    <p>
                      <strong>Admin: </strong>
                      {profile?.full_name || user?.email}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card grid for admin functions */}
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
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SchoolAdmin;