import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { approveStudentDirect, revokeStudentAccessDirect } from "@/utils/databaseUtils";
import { RefreshCw, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsWithProfiles } from "@/utils/supabaseHelpers";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { schoolId } = useAuth();

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [refreshTrigger, schoolId]);

  const fetchStudents = async () => {
    try {
      if (!schoolId) {
        toast.error("Could not determine school ID");
        return;
      }
      
      console.log("AdminStudents: School ID retrieved:", schoolId);
      
      // Use our improved helper function to get students
      const studentsData = await getStudentsWithProfiles(schoolId);
      
      console.log("AdminStudents: Formatted students:", studentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
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
        // Update the local state
        setStudents(students.filter(student => student.id !== studentId));
      } else {
        toast.error("Failed to revoke student access");
      }
    } catch (error) {
      console.error("Error revoking student access:", error);
      toast.error("Failed to revoke student access");
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success("Refreshing students list...");
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
            <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No students found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Students will appear here when they register using your school code.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email/ID</TableHead>
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
                    <TableCell>
                      <span className="font-mono text-xs">{student.email}</span>
                    </TableCell>
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
