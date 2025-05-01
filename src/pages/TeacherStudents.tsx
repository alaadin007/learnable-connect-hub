import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Copy, Mail, UserCheck, UserX } from "lucide-react";

// Define simple flat interfaces to prevent recursive type issues
interface Student {
  id: string;
  created_at: string;
  updated_at: string | null;
  status?: string; // Make status optional as it's not in the DB table directly
  full_name: string | null;
  email: string | null;
}

interface StudentInvite {
  id: string;
  token: string | null;
  email: string | null;
  created_at: string;
  expires_at: string;
  status: string;
}

const TeacherStudents = () => {
  const { user, schoolId } = useAuth();
  const queryClient = useQueryClient();
  const [studentEmail, setStudentEmail] = useState("");
  const [activeTab, setActiveTab] = useState<"invite" | "manage">("invite");
  const [inviteMethod, setInviteMethod] = useState<"code" | "email">("code");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  // Fetch students using explicit typing and manual data mapping to avoid type issues
  const {
    data: students,
    isLoading: studentsLoading,
    error: studentsError
  } = useQuery({
    queryKey: ['students', schoolId],
    queryFn: async () => {
      if (!schoolId) return [] as Student[];
      
      // Since status isn't in the students table directly, we only fetch what's available
      const { data, error } = await supabase
        .from('students')
        .select('id, created_at, updated_at, profiles:id(full_name, email)')
        .eq('school_id', schoolId);
        
      if (error) throw error;
      
      // Manually transform data to a flat structure to avoid complex type inference
      const transformedData: Student[] = [];
      
      if (data && Array.isArray(data)) {
        for (const item of data) {
          // Use a type assertion to help TypeScript understand the structure
          const studentItem = item as any;
          transformedData.push({
            id: studentItem.id || '',
            created_at: studentItem.created_at || '',
            updated_at: studentItem.updated_at || '',
            // Since status doesn't exist in the database, assign a default value
            // In a real app, this would be stored elsewhere or calculated
            status: 'active', // Default status
            full_name: studentItem.profiles?.full_name || null,
            email: studentItem.profiles?.email || null
          });
        }
      }
      
      return transformedData;
    },
    enabled: !!schoolId
  });

  // Fetch student invites with simplified approach to avoid deep type inference
  const {
    data: invites,
    isLoading: invitesLoading,
    error: invitesError
  } = useQuery({
    queryKey: ['studentInvites', schoolId],
    queryFn: async () => {
      if (!schoolId || !user?.id) return [] as StudentInvite[];
      
      try {
        // Use any type to bypass TypeScript's complex type inference
        const { data, error } = await supabase
          .from('teacher_invites')
          .select('id, token, email, created_at, expires_at, status')
          .eq('school_id', schoolId)
          .eq('teacher_id', user.id)
          .order('created_at', { ascending: false }) as { data: any, error: any };
        
        if (error) {
          console.error("Error fetching student invites:", error);
          throw error;
        }
        
        // Simple manual mapping to prevent complex type inference
        const transformedInvites: StudentInvite[] = [];
        
        if (data && Array.isArray(data)) {
          for (const item of data) {
            transformedInvites.push({
              id: item.id || '',
              token: item.token || null,
              email: item.email || null,
              created_at: item.created_at || '',
              expires_at: item.expires_at || '',
              status: item.status || 'pending'
            });
          }
        }
        
        return transformedInvites;
      } catch (err) {
        console.error("Error in student invites query:", err);
        return [] as StudentInvite[];
      }
    },
    enabled: !!schoolId && !!user?.id
  });

  // Generate invite code mutation
  const generateInviteCode = useMutation({
    mutationFn: async () => {
      const response = await supabase.functions.invoke('invite-student', {
        body: { method: 'code' }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedCode(data.code);
      queryClient.invalidateQueries({ queryKey: ['studentInvites', schoolId] });
      toast.success('Invite code generated successfully');
    },
    onError: (error) => {
      console.error('Error generating invite code:', error);
      toast.error('Failed to generate invite code');
    }
  });

  // Send email invite mutation
  const sendEmailInvite = useMutation({
    mutationFn: async (email: string) => {
      const response = await supabase.functions.invoke('invite-student', {
        body: { method: 'email', email }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    },
    onSuccess: () => {
      setStudentEmail('');
      queryClient.invalidateQueries({ queryKey: ['studentInvites', schoolId] });
      toast.success('Invitation email sent successfully');
    },
    onError: (error) => {
      console.error('Error sending email invite:', error);
      toast.error('Failed to send invitation email');
    }
  });

  // Revoke student access mutation
  const revokeAccess = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await supabase.functions.invoke('revoke-student-access', {
        body: { studentId }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      toast.success('Student access revoked');
    },
    onError: (error) => {
      console.error('Error revoking access:', error);
      toast.error('Failed to revoke student access');
    }
  });

  // Approve student mutation
  const approveStudent = useMutation({
    mutationFn: async (studentId: string) => {
      const response = await supabase.functions.invoke('approve-student', {
        body: { studentId }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
      toast.success('Student approved successfully');
    },
    onError: (error) => {
      console.error('Error approving student:', error);
      toast.error('Failed to approve student');
    }
  });

  const handleCopyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success("Code copied to clipboard");
    }
  };

  const handleEmailInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentEmail.trim()) {
      sendEmailInvite.mutate(studentEmail.trim());
    } else {
      toast.error("Please enter a valid email address");
    }
  };

  const handleRevokeAccess = (studentId: string) => {
    if (confirm("Are you sure you want to revoke access for this student?")) {
      revokeAccess.mutate(studentId);
    }
  };

  const handleApproveStudent = (studentId: string) => {
    approveStudent.mutate(studentId);
  };

  // Since we don't have a status field in the database, we'll simulate it based on edge function results
  // In a real app, this would be stored in the database
  const pendingStudents = students?.filter(student => student.status === 'pending') || [];
  const activeStudents = students?.filter(student => student.status === 'active') || [];
  const revokedStudents = students?.filter(student => student.status === 'revoked') || [];

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6">Student Management</h1>
      
      <Tabs defaultValue="invite" value={activeTab} onValueChange={(v) => setActiveTab(v as "invite" | "manage")}>
        <TabsList className="mb-6">
          <TabsTrigger value="invite">Invite Students</TabsTrigger>
          <TabsTrigger value="manage">Manage Students</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invite">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Generate Code Section */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Invite Code</CardTitle>
                <CardDescription>Create a unique code that students can use to join your class</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedCode ? (
                    <div className="p-4 bg-muted rounded-md flex items-center justify-between">
                      <span className="font-mono text-lg">{generatedCode}</span>
                      <Button size="sm" variant="outline" onClick={handleCopyCode}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-muted-foreground mb-2">Click the button below to generate a new invite code</p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => generateInviteCode.mutate()}
                  disabled={generateInviteCode.isPending}
                  className="w-full"
                >
                  {generateInviteCode.isPending ? 'Generating...' : 'Generate New Code'}
                </Button>
              </CardFooter>
            </Card>

            {/* Email Invite Section */}
            <Card>
              <CardHeader>
                <CardTitle>Send Email Invite</CardTitle>
                <CardDescription>Invite a student directly via email</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailInvite} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Student's Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student@example.com"
                      required
                    />
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleEmailInvite}
                  disabled={sendEmailInvite.isPending || !studentEmail.trim()}
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {sendEmailInvite.isPending ? 'Sending...' : 'Send Invite'}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Recent Invites Table */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Recent Invites</CardTitle>
              <CardDescription>Recently generated invite codes and sent invitations</CardDescription>
            </CardHeader>
            <CardContent>
              {invitesLoading ? (
                <div className="text-center py-4">Loading invites...</div>
              ) : invites && invites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invite Type</TableHead>
                      <TableHead>Code/Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>{invite.email ? 'Email' : 'Code'}</TableCell>
                        <TableCell>{invite.email || invite.token}</TableCell>
                        <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{invite.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No invites generated yet</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage">
          {/* Pending Students Section */}
          {pendingStudents.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Pending Students</CardTitle>
                <CardDescription>Students waiting for approval</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.full_name || 'N/A'}</TableCell>
                        <TableCell>{student.email || 'N/A'}</TableCell>
                        <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveStudent(student.id)}
                              disabled={approveStudent.isPending}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleRevokeAccess(student.id)}
                              disabled={revokeAccess.isPending}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Active Students Section */}
          <Card>
            <CardHeader>
              <CardTitle>Active Students</CardTitle>
              <CardDescription>Students with active access to your class</CardDescription>
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="text-center py-4">Loading students...</div>
              ) : activeStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.full_name || 'N/A'}</TableCell>
                        <TableCell>{student.email || 'N/A'}</TableCell>
                        <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleRevokeAccess(student.id)}
                            disabled={revokeAccess.isPending}
                          >
                            <UserX className="h-4 w-4 mr-1" />
                            Revoke Access
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">No active students found</div>
              )}
            </CardContent>
          </Card>
          
          {/* Revoked Students Section */}
          {revokedStudents.length > 0 && (
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Revoked Students</CardTitle>
                <CardDescription>Students whose access has been revoked</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revokedStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.full_name || 'N/A'}</TableCell>
                        <TableCell>{student.email || 'N/A'}</TableCell>
                        <TableCell>{new Date(student.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleApproveStudent(student.id)}
                            disabled={approveStudent.isPending}
                          >
                            <UserCheck className="h-4 w-4 mr-1" />
                            Restore Access
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherStudents;
