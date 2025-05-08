
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

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { schoolId } = useAuth();

  useEffect(() => {
    if (schoolId) {
      fetchTeachers();
    }
  }, [schoolId]);

  const fetchTeachers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, get teacher IDs from the teachers table for this school
      const { data: teacherData, error: teacherError } = await supabase
        .from("teachers")
        .select("id, is_supervisor, created_at")
        .eq("school_id", schoolId);

      if (teacherError) {
        throw teacherError;
      }

      if (!teacherData || teacherData.length === 0) {
        setTeachers([]);
        return;
      }

      // Get teacher profiles
      const teacherIds = teacherData.map(teacher => teacher.id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", teacherIds);

      if (profilesError) {
        throw profilesError;
      }

      // Combine teachers with their profiles
      const combinedData = teacherData.map(teacher => {
        const profile = profilesData?.find(p => p.id === teacher.id);
        return {
          ...teacher,
          full_name: profile?.full_name || "Unknown Name"
        };
      });

      setTeachers(combinedData);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    if (!inviteEmail) {
      setError("Email address is required");
      setIsLoading(false);
      return;
    }
    
    // Check if email already exists
    const { data: emailCheck, error: emailError } = await supabase.rpc('check_if_email_exists', {
      input_email: inviteEmail
    });
    
    if (emailError) {
      console.error("Error checking if email exists:", emailError);
      setError("Error checking email: " + emailError.message);
      setIsLoading(false);
      return;
    }
    
    if (emailCheck === true) {
      // Check user role
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role_by_email', {
        input_email: inviteEmail
      });
      
      if (roleError) {
        console.error("Error checking user role:", roleError);
        setError("Error checking user role: " + roleError.message);
        setIsLoading(false);
        return;
      }
      
      if (roleData) {
        setError(`This email is already registered as a ${roleData}`);
        setIsLoading(false);
        return;
      }
    }

    try {
      // Use the databaseUtils function to invite the teacher
      const result = await inviteTeacherDirect(inviteEmail);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      setSuccess(`Invitation sent to ${inviteEmail}`);
      toast.success("Teacher invited successfully!");
      setInviteEmail("");
      
    } catch (error: any) {
      console.error("Error inviting teacher:", error);
      setError(error.message || "An error occurred while inviting the teacher");
      toast.error("Failed to invite teacher");
    } finally {
      setIsLoading(false);
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
            <Button type="submit" className="flex items-center gap-2" disabled={isLoading}>
              <Mail className="h-4 w-4" />
              {isLoading ? "Sending..." : "Send Invite"}
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
              {isLoading ? "Loading teachers..." : teachers.length === 0 ? "No teachers found" : "List of all teachers"}
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
                  <TableCell>{teacher.is_supervisor ? "Supervisor" : "Teacher"}</TableCell>
                  <TableCell>{new Date(teacher.created_at).toLocaleDateString()}</TableCell>
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
              {teachers.length === 0 && !isLoading && (
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
