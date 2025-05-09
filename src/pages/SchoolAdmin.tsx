import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Copy, CheckCircle, AlertCircle, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/landing/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import { useSchoolCode } from "@/hooks/use-school-code";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SchoolCodeGenerator from "@/components/school-admin/SchoolCodeGenerator";

const SchoolAdmin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [currentCode, setCurrentCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeInfo, setCodeInfo] = useState<{code: string, expiresAt?: string}>({code: ""});
  const { fetchCurrentCode, generateCode, isGenerating } = useSchoolCode();

  // Fetch the current school code on component mount
  useEffect(() => {
    const fetchSchoolCode = async () => {
      if (!profile?.organization?.id) return;

      try {
        setIsLoading(true);
        const code = await fetchCurrentCode(profile.organization.id);
        
        if (code) {
          setCurrentCode(code);
          setCodeInfo({
            code: code,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Approximate
          });
          console.log("Fetched school code:", code);
        }
      } catch (error) {
        console.error("Error fetching school code:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchoolCode();
  }, [profile?.organization?.id, fetchCurrentCode]);

  // Handle code generation callback
  const generateSchoolCode = async () => {
    const schoolId = profile?.organization?.id || profile?.school_id;
    if (!schoolId) {
      toast.error("Could not determine your school ID");
      return;
    }

    try {
      setIsLoading(true);
      const newCode = await generateCode(schoolId);
      
      if (newCode) {
        setCurrentCode(newCode);
        setCodeInfo({
          code: newCode,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Assume 24h expiration
        });
        toast.success("New school code generated successfully");
      } else {
        toast.error("Failed to generate a new code");
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Could not generate a new code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    if (!currentCode) return;

    navigator.clipboard.writeText(currentCode)
      .then(() => {
        setCodeCopied(true);
        toast.success("School code copied to clipboard");
        setTimeout(() => setCodeCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy code");
      });
  };

  const formatExpiryDate = (dateString?: string) => {
    if (!dateString) return "No expiration set";
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return "Invalid date";
    }
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
              
              <div className="space-y-4">
                <Button
                  onClick={generateSchoolCode}
                  disabled={isGenerating || isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {(isGenerating || isLoading) ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-t-transparent border-white animate-spin"></div>
                      <span>Generating...</span>
                    </div>
                  ) : currentCode ? "Generate New School Code" : "Generate School Code"}
                </Button>
                
                {currentCode && (
                  <div className="border rounded-md overflow-hidden mt-4">
                    <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                      <h4 className="text-sm font-medium text-gray-700">Your School Code</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={copyCodeToClipboard}
                        className={codeCopied ? "text-green-600" : ""}
                      >
                        {codeCopied ? (
                          <><CheckCircle className="h-4 w-4 mr-1" /> Copied</>
                        ) : (
                          <><Copy className="h-4 w-4 mr-1" /> Copy</>
                        )}
                      </Button>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-md">
                        <code className="font-mono text-xl font-bold text-blue-700">{currentCode}</code>
                      </div>
                      
                      {codeInfo.expiresAt && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800 flex items-start gap-2 text-xs">
                          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>Expires: {formatExpiryDate(codeInfo.expiresAt)}</span>
                        </div>
                      )}
                      
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-2 text-sm text-blue-800 flex items-start gap-2">
                        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p>Share this code with teachers and students to join your school.</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!currentCode && !isLoading && (
                  <div className="p-3 bg-gray-50 border rounded-md text-center text-gray-500">
                    No school code generated yet. Click the button above to generate a code.
                  </div>
                )}
              </div>
              
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

        {/* Separate section for Student Invite Code */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Student Invitation</h3>
          <Card>
            <CardContent className="p-6">
              <p className="text-gray-600 mb-4">
                Generate a separate invitation code specifically for students to join your school
              </p>
              <div className="max-w-md">
                <SchoolCodeGenerator 
                  variant="student"
                  label="Student Invitation Code"
                  description="Generate and share this code with students who need to join your school"
                />
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
