
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { approveStudentDirect, revokeStudentAccessDirect, getCurrentSchoolInfo } from "@/utils/databaseUtils";
import { RefreshCw, User, Copy } from "lucide-react";

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
  const [schoolInfo, setSchoolInfo] = useState<{ name: string; code: string; id?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    loadSchoolInfo();
  }, []);

  useEffect(() => {
    if (schoolInfo?.id) {
      fetchStudents();
    }
  }, [refreshTrigger, schoolInfo?.id]);

  const loadSchoolInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const schoolData = await getCurrentSchoolInfo();
      
      if (schoolData) {
        setSchoolInfo({
          id: schoolData.id,
          name: schoolData.name,
          code: schoolData.code
        });
      } else {
        setError("Could not load school information");
        toast.error("Could not load school information");
      }
    } catch (error) {
      console.error("Error loading school information:", error);
      setError("Failed to load school information");
      toast.error("Failed to load school information");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!schoolInfo?.id) {
      console.error("No school ID available");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all students from this school
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, school_id, status, created_at")
        .eq("school_id", schoolInfo.id);

      if (studentsError) {
        setError("Error fetching students");
        toast.error("Error fetching students");
        console.error("Error fetching students:", studentsError);
        return;
      }

      if (!studentsData || studentsData.length === 0) {
        setStudents([]);
        setIsLoading(false);
        return;
      }
      
      // Now fetch the profiles data separately with only the columns that exist
      const studentIds = studentsData.map(student => student.id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);
      
      if (profilesError) {
        setError("Error fetching profiles");
        toast.error("Error fetching profiles");
        console.error("Error fetching profiles:", profilesError);
        return;
      }

      // Combine the data from the two queries
      const formattedStudents: Student[] = studentsData.map(student => {
        const profile = profilesData?.find(p => p.id === student.id);
        return {
          id: student.id,
          school_id: student.school_id,
          status: student.status || "pending",
          created_at: student.created_at,
          full_name: profile?.full_name || "No name",
          email: student.id, // Using ID as email placeholder
        };
      });

      setStudents(formattedStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      setError("Failed to load students data");
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveStudent = async (studentId: string) => {
    try {
      setActionInProgress(studentId);
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
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRevokeAccess = async (studentId: string) => {
    try {
      setActionInProgress(studentId);
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

  const filteredStudents = students.filter((student) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.email?.toLowerCase().includes(searchLower)
    );
  });

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Student Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
            <p>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh} 
              className="mt-2"
            >
              Try Again
            </Button>
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
            {!isLoading && schoolInfo?.code && (
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
            <Button variant="outline" onClick={handleRefresh} className="flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary rounded-full border-t-transparent"></div>
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
                            disabled={actionInProgress === student.id}
                          >
                            {actionInProgress === student.id ? 'Processing...' : 'Approve'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => handleRevokeAccess(student.id)}
                          disabled={actionInProgress === student.id}
                        >
                          {actionInProgress === student.id ? 'Processing...' : 'Revoke'}
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
