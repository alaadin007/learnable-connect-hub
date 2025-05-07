import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdminStudentsComponent from "@/components/admin/AdminStudents";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, UserPlus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabaseHelpers, isDataResponse } from "@/utils/supabaseHelpers";
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

interface ProfileData {
  id: string;
  full_name: string | null;
  user_type?: string | null;
}

const AdminStudents = ({ schoolId, schoolInfo }: AdminStudentsProps) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const navigate = useNavigate();

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch all students for this school
      const { data: studentData, error } = await supabase
        .from("students")
        .select("id, school_id, status, created_at")
        .eq("school_id", supabaseHelpers.asSupabaseParam(schoolId));

      if (error || !Array.isArray(studentData)) {
        toast.error("Failed to load students");
        setStudents([]);
        setLoading(false);
        return;
      }
      if (studentData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Extract valid IDs
      const studentIds = studentData
        .filter(isDataResponse)
        .map((student) => student.id)
        .filter((id): id is string => Boolean(id));

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch student profiles safely
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, user_type")
        .in("id", studentIds);

      if (profileError) {
        toast.error("Failed to load student details");
        console.error("Profile fetch error:", profileError);
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch user roles mapping
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", studentIds);

      if (rolesError) {
        console.error("Error fetching user roles:", rolesError.message);
      }

      const roleMap = new Map<string, string>();
      if (rolesData) {
        rolesData.forEach((roleEntry) => {
          if (roleEntry && typeof roleEntry === "object" && "user_id" in roleEntry && "role" in roleEntry) {
            roleMap.set(roleEntry.user_id, roleEntry.role);
          }
        });
      }

      const combinedStudents: Student[] = studentData
        .map((student) => {
          if (!student || typeof student !== "object" || !("id" in student)) return null;

          const studentId = student.id;
          if (!studentId) return null;

          // Find the profile for this student
          const profile = profileData && Array.isArray(profileData)
            ? profileData.find((p) => p && p.id === studentId)
            : null;

          // Get role for this student - prioritize role from user_roles table
          let role = "student"; // default
          if (roleMap.has(studentId)) {
            role = roleMap.get(studentId) ?? role;
          } else if (profile && profile.user_type) {
            role = profile.user_type;
          }

          // Use the profile data if available, otherwise provide fallbacks
          return {
            id: studentId,
            full_name: profile && profile.full_name ? profile.full_name : "Unknown",
            email: studentId, // Use ID as fallback since email is not in profiles table
            status: student.status ?? "unknown",
            created_at: student.created_at ?? new Date().toISOString(),
            role,
          };
        })
        .filter((s): s is Student => s !== null);

      setStudents(combinedStudents);
    } catch (error: unknown) {
      toast.error("An error occurred while loading students");
      console.error("Error in fetchStudents:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolId) fetchStudents();
  }, [schoolId]);

  const handleStatusChange = async (studentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("students")
        .update(supabaseHelpers.prepareSupabaseUpdate({ status: newStatus }))
        .eq("id", supabaseHelpers.asSupabaseParam(studentId));

      if (error) {
        toast.error("Failed to update student status");
        return;
      }

      toast.success(`Student status updated to ${newStatus}`);
      fetchStudents();
    } catch (error: unknown) {
      toast.error("An error occurred while updating status");
      console.error("Error updating status:", error);
    }
  };

  const generateInviteCode = async () => {
    try {
      setGeneratingInvite(true);

      const { data, error } = await supabase.rpc("create_student_invitation", {
        school_id_param: schoolId,
      });

      if (error) {
        toast.error("Failed to generate invite code");
        return;
      }
      if (data && Array.isArray(data) && data.length > 0 && data[0]?.code) {
        setInviteCode(data[0].code);
        setShowInviteModal(true);
        return;
      }
      toast.error("No invite code returned");
    } catch (error: unknown) {
      toast.error("An error occurred while generating invite code");
      console.error("Error generating invite code:", error);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    [student.full_name, student.email, student.status]
      .some((field) => field.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search students..."
            className="border rounded-md p-2 w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={generateInviteCode} disabled={generatingInvite}>
          {generatingInvite ? (
            <>
              Generating Invite Code...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Student
            </>
          )}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.full_name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        student.status === "active"
                          ? "default"
                          : student.status === "pending"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{getRoleDisplayName(student.role as AppRole)}</TableCell>
                  <TableCell>
                    {new Date(student.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {student.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(student.id, "active")}
                        >
                          Approve
                        </Button>
                      )}
                      {student.status === "active" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleStatusChange(student.id, "revoked")}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Invite Code</h2>
            <p className="mb-4">
              Share this code with the student to allow them to join the school:
            </p>
            <div className="mb-4 p-3 bg-gray-100 rounded-md break-all">
              {inviteCode}
            </div>
            <Button onClick={() => setShowInviteModal(false)}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminStudents;
