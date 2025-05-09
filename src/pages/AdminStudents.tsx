
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
import { useSchoolCode } from "@/hooks/use-school-code";

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
  const [generatedCode, setGeneratedCode] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { generateCode, isGenerating: isGeneratingSchoolCode } = useSchoolCode();
  
  // Ensure we have a school ID even if auth context is slow to load
  const schoolId = authSchoolId || profile?.school_id || profile?.organization?.id;
  
  // Load student invites
  useEffect(() => {
    fetchInvites();
  }, [schoolId, refreshTrigger]);

  const fetchInvites = async () => {
    if (!schoolId) {
      console.log("No school ID available to fetch invites");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Fetching student invites for school:", schoolId);
      
      // Try to fetch from student_invites table
      const { data: studentInvites, error: studentInviteError } = await supabase
        .from("student_invites")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(10);
        
      if (studentInvites && studentInvites.length > 0) {
        console.log("Found student invites:", studentInvites);
        setInvites(studentInvites as StudentInvite[]);
      } else {
        // Fallback to teacher_invitations table for display
        const { data, error } = await supabase
          .from("teacher_invitations")
          .select("*")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching teacher invitations:", error);
          throw error;
        }
        
        // Convert teacher_invitations to our StudentInvite type
        const studentInviteData: StudentInvite[] = (data || []).map(invite => ({
          id: invite.id,
          email: invite.email,
          created_at: invite.created_at,
          expires_at: invite.expires_at,
          status: invite.status
        }));
        
        console.log("Using teacher invitations as fallback:", studentInviteData);
        setInvites(studentInviteData);
      }
    } catch (error: any) {
      console.error("Error fetching student invites:", error);
      toast.error("Failed to load student invites");
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCode = async () => {
    if (!schoolId) {
      toast.error("You must be logged in with a school account to generate codes");
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("Generating code for school:", schoolId);
      
      // Try to use the Edge Function first
      try {
        console.log("Invoking invite-student edge function for code generation");
        const { data, error } = await supabase.functions.invoke('invite-student', {
          body: { method: 'code' }
        });
        
        if (error) {
          console.error("Error from invite-student function:", error);
          throw error;
        }
        
        if (data && data.code) {
          console.log("Successfully generated code via edge function:", data);
          setGeneratedCode(data.code);
          toast.success("Student invitation code generated");
          setRefreshTrigger(prev => prev + 1);
          return;
        }
      } catch (edgeFnError: any) {
        console.error("Edge function error for code generation:", edgeFnError);
      }
      
      // Generate school code using the hook as fallback
      const code = await generateCode(schoolId);
      
      if (code) {
        console.log("Generated code successfully:", code);
        setGeneratedCode(code);
        toast.success("Student invitation code generated");
        setRefreshTrigger(prev => prev + 1);
      } else {
        throw new Error("Failed to generate invitation code");
      }
    } catch (error: any) {
      console.error("Error generating code:", error);
      toast.error(error.message || "Failed to generate invitation code");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success("Code copied to clipboard!");
    }
  };
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success("Refreshing invitations...");
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
                <Button 
                  onClick={generateInviteCode}
                  disabled={isLoading || isGeneratingSchoolCode}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isGeneratingSchoolCode || isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Code"
                  )}
                </Button>
                
                {generatedCode && (
                  <div className="mt-4 p-4 bg-muted rounded-lg border">
                    <p className="font-semibold mb-2">Invitation Code:</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-background p-2 rounded border flex-1 text-center text-lg font-mono">
                        {generatedCode}
                      </code>
                      <Button type="button" variant="outline" size="sm" onClick={copyInviteCode}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Share this code with students to join your school
                    </p>
                  </div>
                )}
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
