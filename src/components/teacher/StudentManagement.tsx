
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { approveStudentDirect, inviteStudentDirect, revokeStudentAccessDirect } from '@/utils/databaseUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, Mail, UserPlus } from 'lucide-react'

interface Student {
  id: string;
  full_name: string | null;
  email: string;
  status: string;
  created_at: string;
  last_active: string | null;
  total_sessions: number;
  total_hours: number;
};

const StudentManagement = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'code' | 'email'>('code');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchStudents = async () => {
    try {
      if (!user) throw new Error('Not authenticated');

      // First get the school ID for the current user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.school_id) throw new Error('No school associated');

      // Query for students directly from the students table with a join to profiles
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          created_at,
          status,
          profiles:profiles (
            full_name,
            email
          )
        `)
        .eq('school_id', profile.school_id);

      if (studentError) throw studentError;

      // Transform the data to match our Student interface
      const formattedStudents = studentData.map((student: any) => ({
        id: student.id,
        full_name: student.profiles?.full_name || "No name",
        email: student.profiles?.email || "No email",
        status: student.status || "pending",
        created_at: student.created_at,
        last_active: null, // This would be calculated from session logs
        total_sessions: 0,  // These would be aggregated from session logs
        total_hours: 0
      }));

      setStudents(formattedStudents);
    } catch (error: any) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [user]);

  const handleInviteStudent = async () => {
    if (inviteMethod === 'email' && !inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      const result = await inviteStudentDirect(
        inviteMethod, 
        inviteMethod === 'email' ? inviteEmail : undefined
      );

      if (!result.success) {
        toast.error(result.message || "Failed to create invite");
        return;
      }

      if (inviteMethod === 'code') {
        setInviteCode(result.code || null);
        toast.success("Student invite code generated successfully");
      } else {
        toast.success(`Invite sent to ${inviteEmail}`);
        setInviteEmail('');
      }
    } catch (error: any) {
      console.error("Error inviting student:", error);
      toast.error("Failed to create student invitation: " + (error.message || "Unknown error"));
    } finally {
      setInviting(false);
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    try {
      const success = await approveStudentDirect(studentId);
      
      if (success) {
        toast.success("Student approved successfully");
        // Update the local state
        setStudents(students.map(student => 
          student.id === studentId ? {...student, status: 'active'} : student
        ));
      } else {
        toast.error("Failed to approve student");
      }
    } catch (error: any) {
      console.error("Error approving student:", error);
      toast.error("An error occurred while approving student: " + (error.message || "Unknown error"));
    }
  };

  const handleRevokeAccess = async (studentId: string) => {
    try {
      const success = await revokeStudentAccessDirect(studentId);
      
      if (success) {
        toast.success("Student access revoked");
        // Remove the student from the local state
        setStudents(students.filter(student => student.id !== studentId));
      } else {
        toast.error("Failed to revoke student access");
      }
    } catch (error: any) {
      console.error("Error revoking student access:", error);
      toast.error("An error occurred while revoking student access: " + (error.message || "Unknown error"));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Student Management</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Invite Students */}
        <Card>
          <CardHeader>
            <CardTitle>Invite Students</CardTitle>
            <CardDescription>Generate an invitation code or send email invites.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Button 
                  variant={inviteMethod === 'code' ? 'default' : 'outline'}
                  onClick={() => setInviteMethod('code')}
                >
                  Generate Code
                </Button>
                <Button 
                  variant={inviteMethod === 'email' ? 'default' : 'outline'}
                  onClick={() => setInviteMethod('email')}
                >
                  Send Email
                </Button>
              </div>
              
              {inviteMethod === 'email' && (
                <div>
                  <label htmlFor="email" className="block mb-1 text-sm">Student Email</label>
                  <div className="flex space-x-2">
                    <Input 
                      type="email" 
                      id="email" 
                      placeholder="student@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {inviteCode && (
                <div className="p-3 bg-muted rounded-md">
                  <label className="block mb-1 text-sm font-medium">Invitation Code:</label>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono font-bold">{inviteCode}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode);
                        toast.success("Code copied to clipboard");
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    This code will expire in 7 days. Share it with your student to use during signup.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleInviteStudent}
              disabled={inviteMethod === 'email' && !inviteEmail}
            >
              {inviteMethod === 'code' ? 'Generate Invitation Code' : 'Send Invitation'}
            </Button>
          </CardFooter>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <CardDescription>Manage your students and their access.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary rounded-full border-t-transparent"></div>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-muted-foreground">No students found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <div className="font-medium flex items-center">
                        {student.full_name}
                        {student.status === 'pending' && (
                          <Badge variant="outline" className="ml-2 text-yellow-500 border-yellow-500">Pending</Badge>
                        )}
                        {student.status === 'active' && (
                          <Badge variant="outline" className="ml-2 text-green-500 border-green-500">Active</Badge>
                        )}
                        {student.status === 'suspended' && (
                          <Badge variant="outline" className="ml-2 text-red-500 border-red-500">Suspended</Badge>
                        )}
                        {!student.status && (
                          <Badge variant="outline" className="ml-2">Unknown</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                    <div className="space-x-2">
                      {student.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleApproveStudent(student.id)}
                        >
                          Approve
                        </Button>
                      )}
                      <Button 
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                        onClick={() => handleRevokeAccess(student.id)}
                      >
                        Revoke Access
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={fetchStudents}>
              Refresh List
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default StudentManagement;
