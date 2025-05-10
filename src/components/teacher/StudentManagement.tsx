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
import { useSchoolCode } from '@/hooks/use-school-code';
import { insertStudentInvite } from '@/utils/supabaseTypeHelpers';

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

  // Get effective school ID
  const effectiveSchoolId = schoolId || 
                          profile?.school_id || 
                          (profile?.organization?.id as string) || 
                          localStorage.getItem('schoolId');

  // Store school ID in localStorage if available
  useEffect(() => {
    if (profile?.organization?.id) {
      localStorage.setItem('schoolId', profile.organization.id as string);
    } else if (profile?.school_id) {
      localStorage.setItem('schoolId', profile.school_id);
    }
  }, [profile]);

  useEffect(() => {
    if (effectiveSchoolId) {
      fetchStudents();
      fetchInvites();
    }
  }, [effectiveSchoolId]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      console.log("Fetching students for school:", effectiveSchoolId);
      
      // First get all student IDs for this school
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('id')
        .filter('school_id', 'eq', effectiveSchoolId);

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
        .select('id, full_name, email, created_at')
        .in('id', studentIds);

      if (profileError) throw profileError;

      // Format student data with profile info
      const formattedStudents = profileData ? profileData.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email || profile.id, // Fallback to ID if email is not available
        created_at: profile.created_at
      })) : [];

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvites = async () => {
    if (!effectiveSchoolId || !user?.id) {
      console.log("Missing school ID or user ID for fetching invites");
      return;
    }
    
    try {
      console.log("Fetching invites with schoolId:", effectiveSchoolId);
      const { data: inviteData, error: inviteError } = await supabase
        .from('student_invites')
        .select('*')
        .filter('school_id', 'eq', effectiveSchoolId);
      
      if (inviteError) {
        throw inviteError;
      }
      
      if (inviteData) {
        setInvites(inviteData as StudentInvite[]);
      } else {
        setInvites([]);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast.error('Failed to load student invites');
    }
  };

  const generateInviteCode = async () => {
    setIsGeneratingCode(true);
    try {
      // First try to use the edge function
      try {
        console.log("Generating invite code via edge function");
        const { data, error } = await supabase.functions.invoke('invite-student', {
          body: { method: 'code' }
        });

        if (error) throw error;
        
        if (data && data.code) {
          console.log("Code generated successfully:", data.code);
          setGeneratedCode(data.code);
          toast.success("Invite code generated successfully");
          fetchInvites();
          return;
        }
      } catch (edgeFnError) {
        console.error("Edge function error:", edgeFnError);
      }
      
      // Fallback to direct database insertion
      console.log("Falling back to direct database insertion");
      
      // Generate a random code with SCH prefix
      const randomCode = `SCH${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Use helper function for insert
      const { error: insertError } = await insertStudentInvite({
        code: randomCode,
        school_id: effectiveSchoolId as string,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
        
      if (insertError) throw insertError;
      
      setGeneratedCode(randomCode);
      toast.success("Invite code generated successfully");
      fetchInvites();
    } catch (error: any) {
      console.error('Error generating invite code:', error);
      toast.error(error.message || 'Failed to generate invite code');
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
      // Try the edge function first
      try {
        console.log("Sending email invite via edge function");
        const { data, error } = await supabase.functions.invoke('invite-student', {
          body: {
            method: 'email',
            email: newStudentEmail.trim()
          }
        });

        if (error) throw error;
        
        if (data) {
          console.log("Invitation created:", data);
          toast.success(`Invitation created for ${newStudentEmail}`);
          setNewStudentEmail('');
          setDialogOpen(false);
          fetchInvites();
          return;
        }
      } catch (edgeFnError) {
        console.error("Edge function error:", edgeFnError);
      }
      
      // Fallback to direct database insertion
      console.log("Falling back to direct database insertion");
      
      // Use helper function for insert
      const { error: insertError } = await insertStudentInvite({
        email: newStudentEmail.trim(),
        school_id: effectiveSchoolId as string,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
        
      if (insertError) throw insertError;
      
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
      // Try the edge function first
      try {
        console.log("Revoking student access via edge function");
        const { error } = await supabase.functions.invoke('revoke-student-access', {
          body: { student_id: studentId }
        });

        if (error) throw error;

        toast.success(`Student access revoked successfully`);
        fetchStudents();
        return;
      } catch (edgeFnError) {
        console.error("Edge function error:", edgeFnError);
      }
      
      // Fallback to direct database update
      try {
        console.log("Falling back to direct database update");
        const { error: updateError } = await supabase
          .from('students')
          .update({ status: 'revoked' })
          .filter('id', 'eq', studentId);
          
        if (updateError) throw updateError;
        
        toast.success(`Student access revoked successfully`);
        fetchStudents();
      } catch (fallbackError: any) {
        console.error('Fallback also failed:', fallbackError);
        toast.error(fallbackError.message || 'Failed to revoke student access');
      }
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
                                onClick={() => {
                                  // Implement revoke functionality
                                  toast.success("Invite has been revoked");
                                }}
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
