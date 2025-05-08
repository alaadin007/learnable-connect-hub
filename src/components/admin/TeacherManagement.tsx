import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle2, Mail, UserPlus, X } from "lucide-react";
import { inviteTeacherDirect } from "@/utils/databaseUtils";
import { toast } from "sonner";
import { getTeachersWithProfiles } from "@/utils/supabaseHelpers";

interface Teacher {
  id: string;
  full_name: string;
  isSupevisor?: boolean;
  createdAt?: string;
  email?: string;
}

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { schoolId } = useAuth();

  useEffect(() => {
    if (schoolId) {
      fetchTeachers();
    }
  }, [schoolId]);

  const fetchTeachers = async () => {
    setError(null);
    
    try {
      if (!schoolId) {
        throw new Error("School ID not available");
      }
      
      // Use our improved helper function
      const teacherData = await getTeachersWithProfiles(schoolId);
      setTeachers(teacherData);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      setError(error.message);
    }
  };

  const handleInviteTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!inviteEmail) {
      setError("Email address is required");
      return;
    }
    
    if (!schoolId) {
      setError("School ID not available");
      return;
    }
    
    try {
      // Check if email already exists using direct database query
      const { data: emailExists } = await supabase.rpc('check_if_email_exists', {
        input_email: inviteEmail
      });
      
      if (emailExists === true) {
        const { data: userRole } = await supabase.rpc('get_user_role_by_email', {
          input_email: inviteEmail
        });
        
        if (userRole) {
          setError(`This email is already registered as a ${userRole}`);
          return;
        }
      }

      // Use direct database function instead of edge function
      const { data } = await supabase.rpc('invite_teacher_direct', {
        teacher_email: inviteEmail,
        school_id: schoolId
      });
      
      if (!data) {
        throw new Error("Failed to invite teacher");
      }
      
      setSuccess(`Invitation sent to ${inviteEmail}`);
      toast.success("Teacher invited successfully!");
      setInviteEmail("");
      fetchTeachers(); // Refresh the list
      
    } catch (error: any) {
      console.error("Error inviting teacher:", error);
      setError(error.message || "An error occurred while inviting the teacher");
      toast.error("Failed to invite teacher");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Teacher
          </CardTitle>
          <CardDescription>Send an invitation to a teacher to join your school</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">{success}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleInviteTeacher} className="flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="emailInput" className="block text-sm font-medium text-gray-700 mb-1">
                Teacher Email
              </label>
              <Input
                id="emailInput"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="teacher@school.edu"
                required
                className="w-full"
              />
            </div>
            <Button type="submit" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Send Invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teachers</CardTitle>
          <CardDescription>Manage your school's teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="border rounded-md">
            <TableCaption>
              {teachers.length === 0 ? "No teachers found" : "List of all teachers"}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.full_name}</TableCell>
                  <TableCell>{teacher.isSupevisor ? "Supervisor" : "Teacher"}</TableCell>
                  <TableCell>{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : 'Unknown'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        // Feature to be implemented
                        toast.info("Remove teacher feature coming soon");
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {teachers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No teachers found. Invite teachers to get started.
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

export default TeacherManagement;
