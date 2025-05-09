import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { School, Copy, CheckCircle, X, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Footer from "@/components/landing/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import SchoolCodeManager from "@/components/school-admin/SchoolCodeManager";
import SchoolCodePopup from "@/components/school-admin/SchoolCodePopup";
import { useSchoolCode } from "@/hooks/use-school-code";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SchoolAdmin = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [currentCode, setCurrentCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [codeInfo, setCodeInfo] = useState<{code: string, expiresAt?: string}>({code: ""});
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(false);
  const { generateCode, isGenerating } = useSchoolCode();

  // For debugging - log state changes
  useEffect(() => {
    console.log("showCodePopup state changed:", showCodePopup);
  }, [showCodePopup]);

  // Fetch the current school code on component mount
  useEffect(() => {
    const fetchSchoolCode = async () => {
      if (!profile?.organization?.id) return;

      try {
        const { data, error } = await supabase
          .from("schools")
          .select("code, code_expires_at")
          .eq("id", profile.organization.id)
          .single();

        if (error) throw error;

        if (data && data.code) {
          setCurrentCode(data.code);
          setCodeInfo({
            code: data.code,
            expiresAt: data.code_expires_at
          });
          console.log("Fetched school code:", data.code);
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
    console.log("Code generated:", code);
    setCurrentCode(code);
    setCodeInfo({
      code: code,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Assume 24h expiration
    });
    // Show expanded code section when code is generated
    setCodeExpanded(true);
  };

  const generateSchoolCode = async () => {
    const schoolId = profile?.organization?.id || profile?.school_id;
    if (!schoolId) {
      toast.error("Could not determine your school ID");
      return;
    }

    try {
      const newCode = await generateCode(schoolId);
      if (newCode) {
        handleCodeGenerated(newCode);
      }
    } catch (error) {
      console.error("Failed to generate code:", error);
      toast.error("Could not generate a new code");
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

  // Function to toggle the code expanded state
  const toggleCodeExpanded = () => {
    setCodeExpanded(!codeExpanded);
  };

  // Function to handle opening the popup - now only used for the view details option
  const handleOpenCodePopup = () => {
    console.log("Opening code popup, currentCode:", currentCode);
    if (!currentCode) {
      toast.error("No code available. Please generate a code first.");
      return;
    }
    setShowCodePopup(true);
  };

  // Function to handle closing the popup
  const handleCloseCodePopup = () => {
    console.log("Closing code popup");
    setShowCodePopup(false);
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
                {!currentCode ? (
                  <Button
                    onClick={generateSchoolCode}
                    disabled={isGenerating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isGenerating ? "Generating..." : "Generate School Code"}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={generateSchoolCode}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? "Generating..." : "Generate New School Code"}
                    </Button>
                    
                    <div className="border rounded-md overflow-hidden">
                      <div className="bg-muted p-3 border-b flex items-center justify-between">
                        <h4 className="font-medium">School Invitation Code</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={toggleCodeExpanded}
                          className="h-6 w-6 p-0"
                        >
                          {codeExpanded ? 
                            <X className="h-4 w-4" /> : 
                            <div className="h-4 w-4 flex items-center justify-center">
                              <span className="text-xs font-bold">+</span>
                            </div>
                          }
                        </Button>
                      </div>
                      
                      {codeExpanded && (
                        <div className="p-3 space-y-3">
                          <div className="p-3 bg-muted rounded-md border flex items-center justify-between">
                            <code className="font-mono text-lg">{currentCode}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={copyCodeToClipboard}
                              className={codeCopied ? "text-green-600" : ""}
                            >
                              {codeCopied ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          
                          {codeInfo.expiresAt && (
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800 flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs">
                                Expires: {formatExpiryDate(codeInfo.expiresAt)}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={copyCodeToClipboard}
                              className="flex-1"
                            >
                              {codeCopied ? (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 mr-1" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={handleOpenCodePopup}
                              className="flex-1"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
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
      </main>
      <Footer />

      {/* School Code Popup */}
      <SchoolCodePopup
        isOpen={showCodePopup}
        onClose={handleCloseCodePopup}
        code={codeInfo.code}
        expiresAt={codeInfo.expiresAt}
      />
    </>
  );
};

export default SchoolAdmin;
