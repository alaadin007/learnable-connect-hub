
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { approveStudentDirect, revokeStudentAccessDirect } from "@/utils/databaseUtils";

type Student = {
  id: string;
  school_id: string;
  status: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

const AdminStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      // Get school ID first
      const { data: schoolId, error: schoolIdError } = await supabase
        .rpc("get_user_school_id");

      if (schoolIdError || !schoolId) {
        toast.error("Could not determine school ID");
        console.error("Error getting school ID:", schoolIdError);
        setLoading(false);
        return;
      }
      
      // Log the school ID for debugging
      console.log("AdminStudents: School ID retrieved:", schoolId);
      
      // Fetch all students from this school
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, school_id, status, created_at")
        .eq("school_id", schoolId);

      if (studentsError) {
        toast.error("Error fetching students");
        console.error("Error fetching students:", studentsError);
        setLoading(false);
        return;
      }

      // Log the raw students data for debugging
      console.log("AdminStudents: Raw students data:", studentsData);
      
      // Now fetch the profiles data separately with only the columns that exist
      const studentIds = studentsData.map(student => student.id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      
      if (profilesError) {
        toast.error("Error fetching profiles");
        console.error("Error fetching profiles:", profilesError);
        setLoading(false);
        return;
      }

      // Log the profiles data for debugging
      console.log("AdminStudents: Profiles data:", profilesData);

      // Combine the data from the two queries
      const formattedStudents: Student[] = studentsData.map(student => {
        const profile = profilesData?.find(p => p.id === student.id);
        return {
          id: student.id,
          school_id: student.school_id,
          status: student.status || "pending",
          created_at: student.created_at,
          full_name: profile?.full_name || "No name",
          // Use the user's ID as email since it's not directly available
          email: student.id,
        };
      });

      console.log("AdminStudents: Formatted students:", formattedStudents);
      setStudents(formattedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
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
    } catch (error) {
      console.error("Error approving student:", error);
      toast.error("Failed to approve student");
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
    } catch (error) {
      console.error("Error revoking student access:", error);
      toast.error("Failed to revoke student access");
    }
  };

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Student Management</CardTitle>
          <div className="flex flex-col md:flex-row gap-2">
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={fetchStudents}>
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent"></div>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No students found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.full_name}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {student.status === "active" ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          Active
                        </Badge>
                      ) : student.status === "pending" ? (
                        <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline">{student.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(student.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-x-2">
                        {student.status === "pending" && (
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
                          Revoke
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStudents;
