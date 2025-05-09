
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Copy, RefreshCw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import SchoolCodeGenerator from "@/components/school-admin/SchoolCodeGenerator";

type StudentInvite = {
  id: string;
  email: string;
  code?: string;
  created_at: string;
  expires_at: string;
  status: string;
};

const AdminStudents = () => {
  const { profile, user, schoolId: authSchoolId } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [invites, setInvites] = useState<StudentInvite[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Ensure we have a school ID even if auth context is slow to load
  const schoolId = authSchoolId || profile?.school_id || profile?.organization?.id;

  // Load student invites
  useEffect(() => {
    fetchInvites();
    // eslint-disable-next-line
  }, [schoolId, refreshTrigger]);

  const fetchInvites = async () => {
    if (!schoolId) {
      console.log("No school ID available to fetch invites");
      return;
    }

    setIsLoading(true);
    try {
      // Try to fetch from student_invites table
      const { data: studentInvites } = await supabase
        .from("student_invites")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (studentInvites && studentInvites.length > 0) {
        setInvites(studentInvites as StudentInvite[]);
      } else {
        // Fallback to teacher_invitations table for display
        const { data } = await supabase
          .from("teacher_invitations")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(10);

        // Convert teacher_invitations to our StudentInvite type
        const studentInviteData: StudentInvite[] = (data || []).map(invite => ({
          id: invite.id,
          email: invite.email,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
          status: invite.status
        }));

        setInvites(studentInviteData);
      }
    } catch (error: any) {
      console.error("Error fetching student invites:", error);
      toast.error("Failed to load student invites");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = (code: string) => {
    if (!code) return;
    
    navigator.clipboard.writeText(code)
      .then(() => {
        toast.success("Code copied to clipboard!");
      })
      .catch(err => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy code");
      });
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success("Refreshing invitations...");
  };

  const handleCodeGenerated = () => {
    // Refresh the invite list when a new code is generated
    setTimeout(() => {
      fetchInvites();
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => navigate('/admin', { state: { preserveContext: true } })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>

          <AdminNavbar className="mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left column - Generate Code */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Generate Invitation Code</CardTitle>
                <CardDescription>
                  Create a code for students to join your school
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SchoolCodeGenerator 
                  variant="student"
                  onCodeGenerated={handleCodeGenerated}
                />
              </CardContent>
            </Card>

            {/* Right column - Invites Table */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Invitations</CardTitle>
                  <CardDescription>
                    Student invitation codes and status
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : invites.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email/Code</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell>
                              {invite.email || 
                                <code className="bg-muted p-1 rounded text-xs font-mono">
                                  {invite.code || 'N/A'}
                                </code>
                              }
                            </TableCell>
                            <TableCell>
                              {new Date(invite.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                invite.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : invite.status === "accepted" || invite.status === "used"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                              }`}>
                                {invite.status?.charAt(0).toUpperCase() + invite.status?.slice(1) || 'Unknown'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {invite.code && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => copyInviteCode(invite.code || "")}
                                  className="flex items-center gap-1"
                                >
                                  <Copy className="h-4 w-4" />
                                  Copy
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No invitations found</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Student invitations expire after 7 days
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminStudents;
