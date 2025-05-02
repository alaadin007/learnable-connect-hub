
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
import { Loader2, UserPlus, Mail, Clock, AlertCircle, Check } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';

type Teacher = {
  id: string;
  is_supervisor: boolean;
  profile: {
    full_name: string;
    email: string;
  };
};

type Invitation = {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
};

const TeacherManagement = () => {
  const { schoolId } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (schoolId) {
      fetchTeachers();
      fetchInvitations();
    }
  }, [schoolId]);

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          is_supervisor,
          profile:profiles(
            full_name,
            id
          )
        `)
        .eq('school_id', schoolId);

      if (error) {
        throw error;
      }

      // For each teacher, fetch their email (auth.users table is not accessible directly)
      const teachersWithEmail = await Promise.all(
        (data || []).map(async (teacher) => {
          // Here we're simplifying by using the profile data since we can't directly fetch from auth
          return {
            ...teacher,
            profile: {
              ...teacher.profile,
              email: teacher.profile?.email || 'Unknown email'
            }
          };
        })
      );

      setTeachers(teachersWithEmail);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('teacher_invitations')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load teacher invitations');
    }
  };

  const handleInviteTeacher = async () => {
    if (!newTeacherEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      // Call the RPC function to invite a teacher
      const { data, error } = await supabase.rpc('invite_teacher', {
        teacher_email: newTeacherEmail.trim()
      });

      if (error) {
        throw error;
      }

      toast.success(`Invitation sent to ${newTeacherEmail}`);
      setNewTeacherEmail('');
      setDialogOpen(false);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error inviting teacher:', error);
      toast.error(`Failed to send invitation: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const getInvitationStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pending</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Accepted</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const resendInvitation = async (invitationId: string, email: string) => {
    try {
      // First, delete the old invitation
      const { error: deleteError } = await supabase
        .from('teacher_invitations')
        .delete()
        .eq('id', invitationId);

      if (deleteError) throw deleteError;

      // Then create a new one
      const { error } = await supabase.rpc('invite_teacher', {
        teacher_email: email
      });

      if (error) throw error;

      toast.success(`Invitation resent to ${email}`);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      toast.error(`Failed to resend invitation: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Teacher Management</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a New Teacher</DialogTitle>
              <DialogDescription>
                Send an invitation email to add a teacher to your school.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    placeholder="teacher@example.com"
                    type="email"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleInviteTeacher} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teachers List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Teachers</CardTitle>
          <CardDescription>Teachers with active accounts at your school</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
            </div>
          ) : teachers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.profile?.full_name || "Unknown"}</TableCell>
                    <TableCell>{teacher.profile?.email || "Unknown email"}</TableCell>
                    <TableCell>{teacher.is_supervisor ? "Admin" : "Teacher"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No teachers found. Invite teachers to join your school.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Invitations that have been sent but not yet accepted</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent On</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const status = isExpired && invitation.status === 'pending' ? 'expired' : invitation.status;
                  
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{getInvitationStatusBadge(status)}</TableCell>
                      <TableCell>{format(new Date(invitation.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="mr-2 h-4 w-4 text-gray-500" />
                          {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                          {isExpired && invitation.status === 'pending' && (
                            <span className="ml-2 text-xs text-red-500">(Expired)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(isExpired || invitation.status === 'expired') && invitation.status !== 'accepted' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resendInvitation(invitation.id, invitation.email)}
                          >
                            Resend
                          </Button>
                        )}
                        {invitation.status === 'accepted' && (
                          <div className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-xs">Accepted</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No pending invitations. Invite teachers using the button above.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="flex items-center text-sm text-gray-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>Invitations expire after 7 days</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => fetchInvitations()}>
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TeacherManagement;
