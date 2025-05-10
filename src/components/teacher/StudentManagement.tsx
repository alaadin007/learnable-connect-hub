import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Define helper functions here to avoid importing from supabaseTypeHelpers
const insertStudentInvite = async (invite: {
  code?: string;
  email?: string;
  school_id: string;
  status: string;
  expires_at?: string;
}) => {
  return await supabase
    .from('student_invites')
    .insert(invite)
    .select()
    .single();
};

const updateStudentStatus = async (studentId: string, status: string) => {
  return await supabase
    .from('students')
    .update({ status })
    .eq('id', studentId);
};

const getStudentsForSchool = async (schoolId: string) => {
  return await supabase
    .from('students_view')
    .select('*')
    .eq('school_id', schoolId);
};

const getStudentInvitesForSchool = async (schoolId: string) => {
  return await supabase
    .from('student_invites')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
};

const safeArrayCast = <T,>(data: any): T[] => {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return [];
};

const asId = (id: string): string => {
  return id;
};

const safeStudentData = (data: any): { id: string; full_name: string | null; email: string; created_at: string } | null => {
  if (data && typeof data === 'object' && 'id' in data) {
    return {
      id: data.id,
      full_name: data.full_name || null,
      email: data.email || `${data.id}@unknown.com`,
      created_at: data.created_at || new Date().toISOString()
    };
  }
  return null;
};

// Main component
const StudentManagement = () => {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  
  // Access organization safely with proper type handling
  const schoolId = profile?.school_id || 
    (profile?.organization ? profile.organization.id : null);
  
  // Load students and invites
  useEffect(() => {
    if (schoolId) {
      loadStudents();
      loadInvites();
    } else if (profile) {
      // If we have a profile but no schoolId, show an error
      toast.error('Could not determine your school. Please check your account settings.');
    }
  }, [profile, schoolId]);
  
  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getStudentsForSchool(schoolId as string);
      if (error) throw error;
      
      const safeStudents = safeArrayCast(data).map(student => safeStudentData(student));
      setStudents(safeStudents.filter(s => s !== null));
    } catch (error: any) {
      console.error('Error loading students:', error);
      toast.error(error.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadInvites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getStudentInvitesForSchool(schoolId as string);
      if (error) throw error;
      
      setInvites(safeArrayCast(data));
    } catch (error: any) {
      console.error('Error loading invites:', error);
      toast.error(error.message || 'Failed to load invites');
      setInvites([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInviteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    
    setIsSending(true);
    try {
      const { data, error } = await insertStudentInvite({
        email: email,
        school_id: schoolId as string,
        status: 'pending'
      });
      
      if (error) throw error;
      
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      loadInvites(); // Reload invites to show the new one
    } catch (error: any) {
      console.error('Error inviting student:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };
  
  const handleUpdateStatus = async (studentId: string, status: string) => {
    setIsLoading(true);
    try {
      const { error } = await updateStudentStatus(studentId, status);
      if (error) throw error;
      
      toast.success(`Student status updated to ${status}`);
      loadStudents(); // Reload students to reflect the change
    } catch (error: any) {
      console.error('Error updating student status:', error);
      toast.error(error.message || 'Failed to update student status');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Management</CardTitle>
        <CardDescription>
          Manage students and invitations for your school.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="students" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="students">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Current Students</h3>
              {isLoading ? (
                <p>Loading students...</p>
              ) : students.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <Card key={student.id}>
                      <CardContent className="p-4">
                        <h4 className="font-medium">{student.full_name || 'Unnamed Student'}</h4>
                        <p className="text-sm text-gray-500">{student.email}</p>
                        <Select
                          value={student.status || 'inactive'}
                          onValueChange={(value) => handleUpdateStatus(student.id, value)}
                        >
                          <SelectTrigger className="w-[180px] mt-2">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p>No students found.</p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="invitations">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Send Invitations</h3>
              <form onSubmit={handleInviteStudent} className="space-y-2">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSending}
                  />
                </div>
                <Button type="submit" disabled={isSending}>
                  {isSending ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
              
              <h3 className="text-xl font-semibold mt-6">Pending Invitations</h3>
              {isLoading ? (
                <p>Loading invitations...</p>
              ) : invites.length > 0 ? (
                <ul className="list-disc pl-5">
                  {invites.map((invite) => (
                    <li key={invite.id}>
                      {invite.email} (Created: {new Date(invite.created_at).toLocaleDateString()})
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No pending invitations.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StudentManagement;
