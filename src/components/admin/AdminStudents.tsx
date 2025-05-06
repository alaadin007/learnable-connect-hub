
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, User, Copy, AlertTriangle } from "lucide-react";

type Student = {
  id: string;
  school_id: string;
  status: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

interface AdminStudentsProps {
  schoolId: string;
  schoolInfo: { name: string; code: string; id?: string } | null;
}

const AdminStudents = ({ schoolId, schoolInfo }: AdminStudentsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [refreshTrigger, schoolId]);

  const fetchStudents = async () => {
    try {
      console.log("Fetching students for school:", schoolId);
      setError(null);
      setLoading(true);

      // Fetch all students from this school
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, school_id, status, created_at")
        .eq("school_id", schoolId);

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        setError("Error fetching students. Please refresh.");
        toast.error("Error fetching students");
        setLoading(false);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        console.log("No students found for school:", schoolId);
        setStudents([]);
        setLoading(false);
        return;
      }

      console.log(`Found ${studentsData.length} students, fetching profiles...`);
      
      // Now fetch the profiles data separately
      const studentIds = studentsData.map(student => student.id);

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        // Continue with partial data rather than failing entirely
      }

      // Combine the data from the two queries
      const formattedStudents: Student[] = studentsData.map(student => {
        // Find the matching profile if it exists
        const profile = profilesData && !profilesError 
          ? profilesData.find(p => p.id === student.id) 
          : null;
          
        return {
          id: student.id,
          school_id: student.school_id,
          status: student.status || "pending",
          created_at: student.created_at,
          full_name: profile ? profile.full_name : "No name",
          email: student.id // Use user ID as fallback since email might not be in profiles
        };
      });

      console.log("Formatted students data:", formattedStudents);
      setStudents(formattedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students data. Please refresh.");
      toast.error("Failed to load students");
    } finally {
      setLoading(false);  // Ensure loading is disabled on all paths
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    try {
      setActionInProgress(studentId);
      console.log("Approving student:", studentId);

      // Update the student status directly in the database
      const { error } = await supabase
        .from("students")
        .update({ status: "active" })
        .eq("id", studentId);

      if (error) {
        console.error("Error approving student:", error);
        toast.error("Failed to approve student");
        return;
      }

      toast.success("Student approved successfully");
      // Update the local state
      setStudents(students.map(student =>
        student.id === studentId ? { ...student, status: "active" } : student
      ));
    } catch (error) {
      console.error("Error approving student:", error);
      toast.error("Failed to approve student");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRevokeAccess = async (studentId: string) => {
    try {
      setActionInProgress(studentId);
      console.log("Revoking access for student:", studentId);

      // Delete the student record directly from the database
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

      if (error) {
        console.error("Failed to revoke student access:", error);
        toast.error("Failed to revoke student access");
        return;
      }

      toast.success("Student access revoked");
      // Remove the student from the local state
      setStudents(students.filter(student => student.id !== studentId));
    } catch (error) {
      console.error("Error revoking student access:", error);
      toast.error("Failed to revoke student access");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success("Refreshing students list...");
  };

  const handleCopyCode = () => {
    if (schoolInfo?.code) {
      navigator.clipboard.writeText(schoolInfo.code);
      toast.success("School code copied to clipboard");
    }
  };

  const filteredStudents = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return students.filter((student) => 
      (student.full_name?.toLowerCase().includes(searchLower) || false) ||
      (student.email?.toLowerCase().includes(searchLower) || false) ||
      student.id.toLowerCase().includes(searchLower)
    );
  }, [students, searchTerm]);

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span>Student Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p>{error}</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStudents}
                className="mt-2"
              >
                Try Again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-2"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle>Student Management</CardTitle>

          <div className="flex flex-col md:flex-row gap-2">
            {/* School Code Display */}
            {schoolInfo?.code && (
              <div className="flex items-center gap-2 mr-4">
                <span className="text-sm font-medium">School Code:</span>
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                  {schoolInfo.code}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mb-4"></div>
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
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
                      {student.full_name || "Unknown Name"}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{student.email || student.id}</span>
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
                            disabled={actionInProgress === student.id}
                          >
                            {actionInProgress === student.id ? "Processing..." : "Approve"}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleRevokeAccess(student.id)}
                          disabled={actionInProgress === student.id}
                        >
                          {actionInProgress === student.id ? "Processing..." : "Revoke"}
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
