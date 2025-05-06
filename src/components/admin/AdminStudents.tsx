
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Search, MoreHorizontal } from "lucide-react";
import { supabaseHelpers } from "@/utils/supabaseHelpers";
import { getRoleDisplayName } from "@/utils/roleUtils";
import { AppRole } from "@/contexts/RBACContext";

interface AdminStudentsProps {
  schoolId: string;
  schoolInfo: { name: string; code: string; id?: string } | null;
}

interface Student {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  role: AppRole | string;
}

const AdminStudents = ({ schoolId, schoolInfo }: AdminStudentsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      // Fetch all students for this school
      const { data: studentData, error } = await supabase
        .from("students")
        .select("id, school_id, status, created_at")
        .eq("school_id", supabaseHelpers.asSupabaseParam(schoolId));

      if (error) {
        console.error("Error fetching students:", error.message);
        toast.error("Failed to load students");
        setLoading(false);
        return;
      }

      if (!Array.isArray(studentData) || studentData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Get student profiles to display names
      const studentIds = studentData
        .filter(student => supabaseHelpers.isDataResponse(student))
        .map(student => student.id)
        .filter(Boolean);
      
      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // Fetch profile details for all students
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_type")
        .in("id", studentIds);

      if (profileError) {
        console.error("Error fetching student profiles:", profileError.message);
        toast.error("Failed to load student details");
        setLoading(false);
        return;
      }

      // Fetch user roles from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", studentIds);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError.message);
        // Continue anyway as we can show user_type if roles are not available
      }

      // Create a map of user_id to role
      const roleMap = new Map();
      if (rolesData && Array.isArray(rolesData)) {
        rolesData.forEach(roleEntry => {
          if (supabaseHelpers.isDataResponse(roleEntry)) {
            roleMap.set(roleEntry.user_id, roleEntry.role);
          }
        });
      }

      // Combine student data with profiles
      const combinedStudents: Student[] = [];
      
      if (Array.isArray(studentData) && Array.isArray(profileData)) {
        studentData.forEach(student => {
          if (!supabaseHelpers.isDataResponse(student)) return;
          
          const profile = profileData.find(p => 
            supabaseHelpers.isDataResponse(p) && p.id === student.id
          );
          
          let role = "student"; // Default role
          
          // Check if we have valid profile data
          if (profile && supabaseHelpers.isDataResponse(profile)) {
            // Check if we have a role from user_roles
            if (roleMap.has(student.id)) {
              role = roleMap.get(student.id);
            } else if (profile.user_type) {
              // If no specific role, use user_type
              role = profile.user_type;
            }
            
            combinedStudents.push({
              id: student.id,
              full_name: profile.full_name || "Unknown",
              email: profile.email || "No email",
              status: student.status,
              created_at: student.created_at,
              role: role
            });
          } else {
            // Add entry with minimal information if no profile found
            combinedStudents.push({
              id: student.id,
              full_name: "Unknown",
              email: "No email",
              status: student.status,
              created_at: student.created_at,
              role: role
            });
          }
        });
      }

      setStudents(combinedStudents);
    } catch (error: any) {
      console.error("Error in fetchStudents:", error.message);
      toast.error("An error occurred while loading students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId]);

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("students")
        .update(supabaseHelpers.prepareSupabaseUpdate({ status: newStatus }))
        .eq("id", supabaseHelpers.asSupabaseParam(studentId));

      if (error) {
        console.error("Error updating student status:", error.message);
        toast.error("Failed to update student status");
        return;
      }

      toast.success(`Student status updated to ${newStatus}`);
      fetchStudents(); // Refresh the data
    } catch (error: any) {
      console.error("Error in handleStatusChange:", error.message);
      toast.error("An error occurred while updating status");
    }
  };

  const generateInviteCode = async () => {
    try {
      setGeneratingInvite(true);
      
      const { data, error } = await supabase.rpc("create_student_invitation", {
        school_id_param: schoolId
      });

      if (error) {
        console.error("Error generating invite code:", error.message);
        toast.error("Failed to generate invite code");
        return;
      }

      if (data && Array.isArray(data) && data.length > 0 && data[0]?.code) {
        setInviteCode(data[0].code);
        setShowInviteModal(true);
      } else {
        toast.error("No invite code returned");
      }
    } catch (error: any) {
      console.error("Error in generateInviteCode:", error.message);
      toast.error("An error occurred while generating invite code");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const query = searchQuery.toLowerCase();
    return (
      student.full_name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      student.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Students</h2>
        <Button 
          onClick={generateInviteCode}
          className="flex items-center gap-2"
          disabled={generatingInvite}
        >
          <UserPlus className="h-4 w-4" />
          {generatingInvite ? "Generating..." : "Invite Student"}
        </Button>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search students..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getRoleDisplayName(student.role as AppRole)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.status === 'active' ? "default" : 
                                  student.status === 'pending' ? "secondary" : "destructive"}
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(student.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStatusChange(student.id, 'active')}
                            >
                              Activate
                            </Button>
                          )}
                          {student.status === 'active' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleStatusChange(student.id, 'suspended')}
                            >
                              Suspend
                            </Button>
                          )}
                          {student.status === 'suspended' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleStatusChange(student.id, 'active')}
                            >
                              Reactivate
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">More</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add invite modal code here... */}
    </div>
  );
};

export default AdminStudents;
