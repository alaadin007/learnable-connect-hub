
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { TeacherInvite } from '@/utils/supabaseTypeHelpers';
import { toast } from 'sonner';

const AdminTeachers: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { profile, schoolId } = useAuth();

  useEffect(() => {
    if (schoolId) {
      fetchTeachers();
      fetchInvitations();
    }
  }, [schoolId]);

  const fetchTeachers = async () => {
    if (!schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          is_supervisor,
          profiles (
            id,
            full_name,
            email,
            is_active
          )
        `)
        .eq('school_id', schoolId);
      
      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    }
  };

  const fetchInvitations = async () => {
    if (!schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from('teacher_invitations')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      setInvites(data as TeacherInvite[] || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    }
  };

  const handleInviteTeacher = async () => {
    if (!schoolId || !profile?.id || !newTeacherEmail.trim()) {
      toast.error('Missing required information');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-teacher', {
        body: {
          email: newTeacherEmail.trim(),
          school_id: schoolId,
          created_by: profile.id
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Invitation sent to ${newTeacherEmail}`);
        setNewTeacherEmail('');
        fetchInvitations(); // Refresh invitation list
      } else {
        toast.error(data?.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error inviting teacher:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('teacher_invitations')
        .delete()
        .eq('id', inviteId);
      
      if (error) throw error;
      
      setInvites(invites.filter(invite => invite.id !== inviteId));
      toast.success('Invitation deleted');
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Failed to delete invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Teacher Management</h1>
      
      {/* Teacher Invitation Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Invite a Teacher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              type="email"
              placeholder="Teacher's email address"
              value={newTeacherEmail}
              onChange={(e) => setNewTeacherEmail(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleInviteTeacher}
              disabled={loading || !newTeacherEmail.trim()}
            >
              {loading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Current Teachers */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.length > 0 ? (
                teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell>{teacher.profiles?.full_name || 'Unknown'}</TableCell>
                    <TableCell>{teacher.profiles?.email || 'No email'}</TableCell>
                    <TableCell>
                      {teacher.profiles?.is_active ? (
                        <span className="text-green-500">Active</span>
                      ) : (
                        <span className="text-red-500">Inactive</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.is_supervisor ? (
                        <span className="text-blue-500">Yes</span>
                      ) : (
                        <span>No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Actions will be added in future implementations */}
                      <Button variant="outline" size="sm" disabled>Manage</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No teachers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited On</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.length > 0 ? (
                invites.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>{invite.email}</TableCell>
                    <TableCell>
                      <span className={
                        invite.status === 'pending' 
                          ? 'text-yellow-500'
                          : invite.status === 'accepted' 
                            ? 'text-green-500' 
                            : 'text-red-500'
                      }>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(invite.created_at)}</TableCell>
                    <TableCell>{formatDate(invite.expires_at)}</TableCell>
                    <TableCell>
                      {invite.status === 'pending' && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteInvite(invite.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    No pending invitations
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTeachers;
