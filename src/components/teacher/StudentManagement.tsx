
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RefreshCw, Copy } from 'lucide-react';
import { approveStudentDirect, inviteStudentDirect, revokeStudentAccessDirect } from '@/utils/databaseUtils';

type Student = {
  id: string;
  full_name: string | null;
  email: string;
  status: string;
};

interface StudentManagementProps {
  schoolId?: string | null;
  isLoading?: boolean;
  schoolInfo?: {name: string; code: string} | null;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ 
  schoolId: propSchoolId, 
  isLoading: propIsLoading = false,
  schoolInfo: propSchoolInfo = null
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMethod, setInviteMethod] = useState<'code' | 'email'>('code');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<{name: string; code: string} | null>(null);
  const { user } = useAuth();

  // Use prop values if provided
  useEffect(() => {
    if (propSchoolInfo) {
      setSchoolInfo(propSchoolInfo);
    }
  }, [propSchoolInfo]);

  useEffect(() => {
    // If school ID is provided as a prop, use it
    if (propSchoolId) {
      setSchoolId(propSchoolId);
    } 
    // Otherwise fetch it
    else {
      const fetchSchoolId = async () => {
        try {
          const { data: schoolIdData, error } = await supabase.rpc('get_user_school_id');
          
          if (error) {
            console.error('Error fetching school ID:', error);
            return;
          }
          
          if (schoolIdData) {
            setSchoolId(schoolIdData);
          }
        } catch (error) {
          console.error('Error in fetchSchoolId:', error);
        }
      };
      
      fetchSchoolId();
    }
  }, [propSchoolId]);

  // Load students when we have a school ID
  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId]);

  const fetchStudents = async () => {
    if (!schoolId) {
      console.warn("Cannot fetch students without a school ID");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Get all students from the same school
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          status,
          profiles:id (
            full_name,
            email
          )
        `)
        .eq('school_id', schoolId);
      
      if (studentsError) {
        toast.error("Could not load students");
        console.error("Error fetching students:", studentsError);
        setLoading(false);
        return;
      }

      // Safely access profile data with proper type handling
      const formattedStudents: Student[] = studentsData.map((student: any) => {
        // Use type assertion to handle different possible shapes of profile data
        const profileData = student.profiles as any;
        let studentName = "No name";
        let studentEmail = "No email";
        
        if (profileData) {
          if (Array.isArray(profileData) && profileData.length > 0) {
            studentName = profileData[0]?.full_name || "No name";
            studentEmail = profileData[0]?.email || "No email";
          } else if (typeof profileData === 'object') {
            studentName = profileData.full_name || "No name";
            studentEmail = profileData.email || "No email";
          }
        }
        
        return {
          id: student.id,
          full_name: studentName,
          email: studentEmail || student.id,
          status: student.status || "pending"
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error("Error in fetchStudents:", error);
      toast.error("An error occurred while loading students");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStudent = async () => {
    if (!schoolId) {
      toast.error("School information is unavailable");
      return;
    }
    
    try {
      if (inviteMethod === 'email' && !inviteEmail) {
        toast.error("Please enter an email address");
        return;
      }

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
    } catch (error) {
      console.error("Error inviting student:", error);
      toast.error("Failed to create student invitation");
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    if (!schoolId) {
      toast.error("School information is unavailable");
      return;
    }
    
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
    } catch (error) {
      console.error("Error approving student:", error);
      toast.error("An error occurred while approving student");
    }
  };

  const handleRevokeAccess = async (studentId: string) => {
    if (!schoolId) {
      toast.error("School information is unavailable");
      return;
    }
    
    try {
      const success = await revokeStudentAccessDirect(studentId);
      
      if (success) {
        toast.success("Student access revoked");
        // Remove the student from the local state
        setStudents(students.filter(student => student.id !== studentId));
      } else {
        toast.error("Failed to revoke student access");
      }
    } catch (error) {
      console.error("Error revoking student access:", error);
      toast.error("An error occurred while revoking student access");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* School Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>School Information</CardTitle>
          <CardDescription>
            Use this code when inviting students to your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <span className="font-medium min-w-32">School Name:</span>
              {propIsLoading ? (
                <div className="h-5 w-32 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                <span>{schoolInfo?.name || "Not available"}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium min-w-32">School Code:</span>
              {propIsLoading ? (
                <div className="h-5 w-24 bg-gray-200 animate-pulse rounded font-mono"></div>
              ) : (
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                    {schoolInfo?.code || "Not available"}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const code = schoolInfo?.code;
                      if (code) {
                        navigator.clipboard.writeText(code);
                        toast.success("School code copied to clipboard!");
                      }
                    }}
                    disabled={!schoolInfo?.code}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Students will need this code to register for an account at your school.
            </p>
          </div>
        </CardContent>
      </Card>
      
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
                      <Copy className="h-4 w-4" />
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
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Student List</CardTitle>
              <CardDescription>Manage your students and their access.</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStudents} 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading || propIsLoading ? (
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
