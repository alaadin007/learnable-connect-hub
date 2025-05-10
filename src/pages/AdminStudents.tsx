import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { getSchoolIdSync } from '@/utils/analyticsUtils';

// Define Student type
interface Student {
  id: string;
  created_at: string;
  updated_at: string;
  email: string;
  full_name: string;
  status: 'pending' | 'active' | 'revoked';
  school_id: string;
}

const AdminStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      // Use the synchronous version for the initial value
      const schoolId = getSchoolIdSync();
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);
        
      if (error) throw error;
      
      // Then update with the actual data after fetching
      setStudents(data as Student[]);
    } catch (err) {
      console.error('Error fetching students:', err);
      toast.error('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteStudent = async () => {
    setIsInviting(true);
    try {
      const schoolId = getSchoolIdSync();
      
      const { data, error } = await supabase.functions.invoke('invite-student', {
        body: {
          email: inviteEmail,
          school_id: schoolId,
        },
      });

      if (error) {
        console.error('Function error:', error);
        toast.error(`Failed to invite student: ${error.message}`);
      } else {
        toast.success('Student invite sent successfully');
        setInviteEmail('');
        setIsDialogOpen(false);
        fetchStudents();
      }
    } catch (err) {
      console.error('Error inviting student:', err);
      toast.error('Failed to invite student');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeAccess = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'revoked' })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Student access revoked');
      fetchStudents();
    } catch (err) {
      console.error('Error revoking access:', err);
      toast.error('Failed to revoke access');
    }
  };

  const handleGrantAccess = async (studentId: string) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'active' })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Student access granted');
      fetchStudents();
    } catch (err) {
      console.error('Error granting access:', err);
      toast.error('Failed to grant access');
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Manage Students</CardTitle>
          </CardHeader>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">Invite Student</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite Student</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="col-span-3"
                    type="email"
                  />
                </div>
              </div>
              <Button onClick={handleInviteStudent} disabled={isInviting}>
                {isInviting ? 'Inviting...' : 'Send Invite'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {Array(5)
                      .fill(null)
                      .map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                          <TableCell className="text-right">
                            <Skeleton className="w-24 h-8" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            student.status === 'active'
                              ? 'success'
                              : student.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.status === 'active' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeAccess(student.id)}
                          >
                            Revoke Access
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGrantAccess(student.id)}
                          >
                            Grant Access
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminStudents;
