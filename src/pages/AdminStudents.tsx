
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  X, 
  AlertTriangle, 
  Search, 
  UserPlus, 
  RefreshCw 
} from "lucide-react";
import { Student } from "@/utils/supabaseHelpers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import AdminNavbar from "@/components/school-admin/AdminNavbar";

const AdminStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const schoolId = getSchoolIdWithFallback();
      
      // Call a proper RPC function or view to get students with profiles
      const { data, error } = await supabase
        .rpc('get_students_with_profiles', { school_id_param: schoolId });
        
      if (error) {
        throw error;
      }
      
      if (data) {
        // Map the results to match the Student interface
        const formattedStudents: Student[] = data.map(student => ({
          id: student.id,
          created_at: student.created_at,
          updated_at: student.created_at, // Use created_at as fallback for updated_at
          email: student.email,
          full_name: student.full_name, 
          status: student.status as 'pending' | 'active' | 'revoked',
          school_id: schoolId
        }));
        
        setStudents(formattedStudents);
        setFilteredStudents(formattedStudents);
      }
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError(err.message || "Failed to load students");
      
      // Use mock data in development
      if (process.env.NODE_ENV === 'development') {
        const mockStudents: Student[] = [
          {
            id: "1",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email: "student1@example.com",
            full_name: "Alice Johnson",
            status: "active",
            school_id: "school-123"
          },
          {
            id: "2",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email: "student2@example.com",
            full_name: "Bob Smith",
            status: "pending",
            school_id: "school-123"
          },
          {
            id: "3",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            email: "student3@example.com",
            full_name: "Charlie Brown",
            status: "revoked",
            school_id: "school-123"
          }
        ];
        
        setStudents(mockStudents);
        setFilteredStudents(mockStudents);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    // Filter students based on search query
    if (searchQuery.trim() === "") {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.full_name.toLowerCase().includes(query) ||
          student.email.toLowerCase().includes(query)
      );
      setFilteredStudents(filtered);
    }
  }, [searchQuery, students]);

  const handleApproveStudent = async (studentId: string) => {
    setActionLoading(studentId);
    try {
      // Call the approve_student_direct function
      const { error } = await supabase.rpc('approve_student_direct', {
        student_id_param: studentId
      });
      
      if (error) throw error;
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, status: 'active' as const } 
            : student
        )
      );
      
      toast.success("Student approved successfully");
    } catch (err: any) {
      console.error("Error approving student:", err);
      toast.error(err.message || "Failed to approve student");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeStudent = async (studentId: string) => {
    setActionLoading(studentId);
    try {
      // Call the revoke_student_access_direct function
      const { error } = await supabase.rpc('revoke_student_access_direct', {
        student_id_param: studentId
      });
      
      if (error) throw error;
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === studentId 
            ? { ...student, status: 'revoked' as const } 
            : student
        )
      );
      
      toast.success("Student access revoked");
    } catch (err: any) {
      console.error("Error revoking student access:", err);
      toast.error(err.message || "Failed to revoke student access");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-6">Student Management</h1>
          
          <AdminNavbar className="mb-8" />
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl">Students</CardTitle>
                  <CardDescription>
                    Manage student accounts and access
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchStudents}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => navigate("/admin/invite-students")}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Students
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search students by name or email..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 rounded p-4 mb-4">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Loading students...
                        </TableCell>
                      </TableRow>
                    ) : filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          No students found. Invite some students to get started!
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>
                            {student.status === "active" && (
                              <Badge variant="success">Active</Badge>
                            )}
                            {student.status === "pending" && (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                            {student.status === "revoked" && (
                              <Badge variant="destructive">Revoked</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveStudent(student.id)}
                                disabled={actionLoading === student.id}
                                className="mr-2"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            )}
                            {student.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeStudent(student.id)}
                                disabled={actionLoading === student.id}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Revoke
                              </Button>
                            )}
                            {student.status === "revoked" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveStudent(student.id)}
                                disabled={actionLoading === student.id}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Reactivate
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminStudents;
