
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Dialog,
  DialogContent, 
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Copy, Loader2, UserPlus, Mail, Clock, AlertCircle, Check, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  created_at: string;
};

type StudentInvite = {
  id: string;
  code: string;
  email: string | null;
  status: string;
  created_at: string;
  expires_at: string;
};

const StudentManagement = () => {
  const { user, profile, schoolId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [invites, setInvites] = useState<StudentInvite[]>([]);
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'code'>('email');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [codeGenerationError, setCodeGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
      fetchInvites();
    }
  }, [schoolId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // First get all student IDs for this school
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId);

      if (studentError) throw studentError;

      if (!studentData || studentData.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      // Then get profile data for these students
      const studentIds = studentData.map(s => s.id);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .in('id', studentIds);

      if (profileError) throw profileError;

      // Format student data with profile info
      const formattedStudents = (profileData || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.id, // Using ID as placeholder since we can't access auth.users
        created_at: profile.created_at
      }));

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!schoolId || !user?.id) {
      return;
    }
    
    try {
      // Added throttling control to prevent excessive requests
      const { data: inviteData, error } = await supabase
        .from('student_invites')
        .select('id, code, email, created_at, expires_at, status')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(10); // Limit the number of results to prevent large data transfers
        
      if (error) {
        throw error;
      }
      
      setInvites(inviteData as StudentInvite[]);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load student invites');
    }
  };

  const generateInviteCode = async () => {
    setIsGeneratingCode(true);
    setCodeGenerationError(null);
    
    try {
      console.log("Getting auth session for code generation");
      
      // Get the session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Authentication required");
      }
      
      console.log("Calling generate-student-code function");
      
      // Call the updated edge function
      const { data, error } = await supabase.functions.invoke('generate-student-code', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error("Error from generate-student-code function:", error);
        throw new Error(error.message || "Failed to generate code");
      }
      
      if (!data || !data.code) {
        console.error("Invalid response format:", data);
        throw new Error('Code not found in server response');
      }
      
      console.log("Generated code response:", data);
      setGeneratedCode(data.code);
      toast.success("Invite code generated successfully");
      fetchInvites();
    } catch (error: any) {
      console.error('Error generating invite code:', error);
      toast.error(error.message || 'Failed to generate invite code');
      setCodeGenerationError(error.message || "Failed to generate code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const sendEmailInvite = async () => {
    if (!newStudentEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      console.log("Calling invite-student edge function for email invite:", newStudentEmail);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Authentication required");
      }
      
      // Use the invite-student function for email invites with better error handling
      const { data, error } = await supabase.functions.invoke('invite-student', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          method: 'email',
          email: newStudentEmail.trim()
        }
      });

      if (error) {
        console.error("Error from invite-student function:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No response from server');
      }
      
      console.log("Email invite response:", data);
      toast.success(`Invitation created for ${newStudentEmail}`);
      setNewStudentEmail('');
      setDialogOpen(false);
      fetchInvites();
    } catch (error: any) {
      console.error('Error inviting student:', error);
      toast.error(error.message || 'Failed to create student invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard");
  };

  const revokeStudentAccess = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${studentName || 'this student'}?`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Authentication required");
      }
      
      const { data, error } = await supabase.functions.invoke('revoke-student-access', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { student_id: studentId }
      });

      if (error) throw error;

      toast.success(`Student access revoked successfully`);
      fetchStudents();
    } catch (error: any) {
      console.error('Error revoking student access:', error);
      toast.error(error.message || 'Failed to revoke student access');
    }
  };

  const getInviteStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'used':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Used</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Student Management</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Student</DialogTitle>
              <DialogDescription>
                Create an invite for students to join your class
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Tabs defaultValue="email" onValueChange={(v) => setInviteMethod(v as 'email' | 'code')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email">Email Invite</TabsTrigger>
                  <TabsTrigger value="code">Generate Code</TabsTrigger>
                </TabsList>
                <TabsContent value="email" className="pt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Student Email</Label>
                      <Input
                        id="email"
                        placeholder="student@example.com"
                        type="email"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                      />
                      <p className="text-sm text-muted-foreground">
                        The student will receive instructions to sign up.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="code" className="pt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Generate a code that students can use to join your class.
                    </p>
                    {generatedCode ? (
                      <div className="mt-4">
                        <Label>Invite Code</Label>
                        <div className="flex items-center mt-1">
                          <div className="bg-muted p-2 rounded-l-md font-mono border border-r-0 flex-1">
                            {generatedCode}
                          </div>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="rounded-l-none"
                            onClick={() => handleCopyCode(generatedCode)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-green-600 mt-2">
                          Share this code with your students
                        </p>
                      </div>
                    ) : (
                      <>
                        <Button 
                          type="button" 
                          onClick={generateInviteCode}
                          disabled={isGeneratingCode}
                          className="w-full"
                        >
                          {isGeneratingCode ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate New Code'
                          )}
                        </Button>
                        
                        {codeGenerationError && (
                          <p className="text-sm text-red-600 mt-2">
                            {codeGenerationError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            <DialogFooter>
              {inviteMethod === 'email' ? (
                <Button type="submit" onClick={sendEmailInvite} disabled={isSending || !newStudentEmail}>
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Create Invitation
                    </>
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={() => setDialogOpen(false)}>
                  Close
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Current Students</TabsTrigger>
          <TabsTrigger value="invites">Invitations & Codes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="students" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
              <CardDescription>Students currently enrolled in your class</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
                </div>
              ) : students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email/ID</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name || "Unknown"}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{format(new Date(student.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => revokeStudentAccess(student.id, student.full_name || '')}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Revoke Access
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No students found. Add students using the button above.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="invites" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitations & Codes</CardTitle>
              <CardDescription>Manage student invites and access codes</CardDescription>
            </CardHeader>
            <CardContent>
              {invites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Code/Email</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => {
                      const isExpired = new Date(invite.expires_at) < new Date();
                      const status = isExpired && invite.status === 'pending' ? 'expired' : invite.status;
                      
                      return (
                        <TableRow key={invite.id}>
                          <TableCell>{invite.email ? 'Email Invite' : 'Code'}</TableCell>
                          <TableCell className="font-medium">
                            {invite.email || (
                              <div className="flex items-center">
                                <span className="font-mono">{invite.code}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-6 w-6 ml-1"
                                  onClick={() => handleCopyCode(invite.code)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{format(new Date(invite.created_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4 text-gray-500" />
                              {format(new Date(invite.expires_at), 'MMM d, yyyy')}
                              {isExpired && invite.status === 'pending' && (
                                <span className="ml-2 text-xs text-red-500">(Expired)</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getInviteStatusBadge(status)}</TableCell>
                          <TableCell>
                            {invite.status === 'used' ? (
                              <div className="flex items-center text-green-600">
                                <Check className="h-4 w-4 mr-1" />
                                <span className="text-xs">Used</span>
                              </div>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                              >
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No invites found. Create an invitation using the button above.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <div className="flex items-center text-sm text-gray-500">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Invitations expire after 7 days</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => fetchInvites()}>
                Refresh
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentManagement;
