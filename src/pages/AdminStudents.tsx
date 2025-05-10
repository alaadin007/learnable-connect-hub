
// AdminStudents.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import { getSchoolIdWithFallback } from "@/utils/apiHelpers";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/utils/supabaseHelpers";

const statusVariantMap: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  active: "outline", // Change from "success" to "outline"
  pending: "secondary",
  revoked: "destructive"
};

const AdminStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const schoolId = getSchoolIdWithFallback();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("school_id", schoolId)
        .eq("user_type", "student")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error",
          description: "Failed to load students.",
          variant: "destructive",
        });
        // Use fallback data for better UX
        setStudents([
          {
            id: "1",
            created_at: new Date().toISOString(),
            email: "student1@example.com",
            full_name: "John Doe",
            status: "active",
            school_id: schoolId,
          },
          {
            id: "2",
            created_at: new Date().toISOString(),
            email: "student2@example.com", 
            full_name: "Jane Smith",
            status: "active",
            school_id: schoolId,
          },
        ]);
      } else {
        // Transform the data to match the Student interface
        const transformedData: Student[] = (data || []).map(profile => ({
          id: profile.id,
          created_at: profile.created_at,
          email: profile.email || '',
          full_name: profile.full_name || '',
          status: profile.is_active === false ? 'revoked' : 'active',
          school_id: profile.school_id || '',
        }));
        setStudents(transformedData);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      toast({
        title: "Error",
        description: "Failed to load students.",
        variant: "destructive",
      });
      // Use fallback data for better UX
      setStudents([
        {
          id: "1",
          created_at: new Date().toISOString(),
          email: "student1@example.com",
          full_name: "John Doe",
          status: "active",
          school_id: getSchoolIdWithFallback(),
        },
        {
          id: "2", 
          created_at: new Date().toISOString(),
          email: "student2@example.com",
          full_name: "Jane Smith", 
          status: "active",
          school_id: getSchoolIdWithFallback(),
        },
      ]);
    }
  };

  const filteredStudents = React.useMemo(() => {
    let filtered = students;

    if (searchQuery) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((student) =>
        student.full_name.toLowerCase().includes(lowerSearchQuery) ||
        student.email.toLowerCase().includes(lowerSearchQuery)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((student) => student.status === filterStatus);
    }

    return filtered;
  }, [students, searchQuery, filterStatus]);

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: newStatus === "active" })
        .eq("id", studentId);

      if (error) {
        console.error("Error updating student status:", error);
        toast({
          title: "Error",
          description: "Failed to update student status.",
          variant: "destructive",
        });
      } else {
        setStudents((prevStudents) =>
          prevStudents.map((student) =>
            student.id === studentId ? { ...student, status: newStatus } : student
          )
        );
        toast({
          title: "Success",
          description: "Student status updated successfully.",
        });
      }
    } catch (error) {
      console.error("Error updating student status:", error);
      toast({
        title: "Error",
        description: "Failed to update student status.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Manage Students</h1>
          </div>

          <AdminNavbar className="mb-8" />

          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>
                View, search, and manage student accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="search"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption>
                      A list of all students in your school.
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No students found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.full_name}</TableCell>
                            <TableCell>{student.email}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariantMap[student.status] || "default"}>
                                {student.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {student.status !== "revoked" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(student.id, "revoked")}
                                >
                                  Revoke Access
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStatusChange(student.id, "active")}
                                >
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
