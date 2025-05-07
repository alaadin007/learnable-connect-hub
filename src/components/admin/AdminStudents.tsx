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
  email: string | null;
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
        .select("id, full_name, email, user_type")
        .in("id", studentIds);

      if (profileError || !Array.isArray(profileData)) {
        toast.error("Failed to load student details");
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
      rolesData?.forEach((roleEntry) => {
        if (roleEntry && typeof roleEntry === "object" && "user_id" in roleEntry && "role" in roleEntry) {
          roleMap.set(roleEntry.user_id, roleEntry.role);
        }
      });

      const combinedStudents: Student[] = studentData.map((student) => {
        if (!student || typeof student !== "object" || !("id" in student)) return null;

        const studentId = student.id;
        if (!studentId) return null;

        const profile = profileData.find((p) => p && p.id === studentId);

        let role = "student"; // default
        if (roleMap.has(studentId)) role = roleMap.get(studentId) ?? role;
        else if (profile?.user_type) role = profile.user_type;

        return {
          id: studentId,
          full_name: profile?.full_name ?? "Unknown",
          email: profile?.email ?? "No email",
          status: student.status ?? "unknown",
          created_at: student.created_at ?? new Date().toISOString(),
          role,
        };
      }).filter((s): s is Student => s !== null);

      setStudents(combinedStudents);
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
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

  // UI omitted here for brevity; use your own UI code with similar pattern.

  return (
    <>
      {/* Your UI goes here */}
      {/* Use filteredStudents, loading states, invite modal, status change buttons etc. */}
    </>
  );
};

export default AdminStudents;