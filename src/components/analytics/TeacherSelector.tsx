
import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface TeacherSelectorProps {
  schoolId: string;
  selectedTeacherId?: string;
  onTeacherChange: (teacherId: string | undefined) => void;
}

interface Teacher {
  id: string;
  name: string;
}

export function TeacherSelector({
  schoolId,
  selectedTeacherId,
  onTeacherChange,
}: TeacherSelectorProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const { user, session } = useAuth();

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) {
        setTeachers([]);
        return;
      }

      setIsLoading(true);
      try {
        console.log(`TeacherSelector: Fetching teachers for school ${schoolId}`);
        
        // First check if we have an active session
        if (!session) {
          console.warn("TeacherSelector: No active session when fetching teachers");
          throw new Error("Authentication required");
        }
        
        // First, get teacher IDs with a simple query
        const { data: teachersData, error } = await supabase
          .from("teachers")
          .select("id")
          .eq("school_id", schoolId)
          .abortSignal(new AbortController().signal); // Allow for proper clean-up on unmount

        if (error) {
          console.error("Error fetching teacher IDs:", error);
          throw new Error(`Failed to load teachers: ${error.message}`);
        }

        if (!teachersData || teachersData.length === 0) {
          setTeachers([]);
          setIsLoading(false);
          return;
        }

        // Then, get profile data for these teachers
        const teacherIds = teachersData.map((t) => t.id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", teacherIds);

        if (profilesError) {
          console.error("Error fetching teacher profiles:", profilesError);
          throw new Error(`Failed to load teacher information: ${profilesError.message}`);
        }

        const formattedTeachers: Teacher[] = (profilesData ?? []).map(
          (profile) => ({
            id: profile.id,
            name: profile.full_name || "Unknown Teacher",
          })
        );

        console.log(`TeacherSelector: Found ${formattedTeachers.length} teachers`);
        setTeachers(formattedTeachers);
      } catch (error: any) {
        console.error("Error in TeacherSelector:", error);
        
        // If specifically an auth error, show a friendly message
        if (error.message?.includes("Authentication") || error.message?.includes("Authorization")) {
          toast.error("Please log in to view teachers", {
            description: "Your session may have expired"
          });
        } 
        // Implement retry logic for transient errors
        else if (loadAttempts < 2) {
          console.log(`TeacherSelector: Retrying... Attempt ${loadAttempts + 1}`);
          setLoadAttempts(prev => prev + 1);
          setTimeout(() => fetchTeachers(), 1000); // Retry after 1 second
        } else {
          toast.error("Failed to load teachers. Please refresh the page.");
          setTeachers([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, [schoolId, loadAttempts, session, user]);

  const labelId = "teacher-selector-label";

  return (
    <div className="space-y-2">
      <label id={labelId} className="text-sm font-medium">
        Filter by Teacher:
      </label>
      <Select
        value={selectedTeacherId ?? "all"}
        onValueChange={(value) =>
          onTeacherChange(value === "all" ? undefined : value)
        }
        disabled={isLoading}
        aria-labelledby={labelId}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select teacher..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>

          {isLoading ? (
            <SelectItem disabled value="loading" className="cursor-default">
              <div className="flex items-center justify-center space-x-2 py-1">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            </SelectItem>
          ) : teachers.length === 0 ? (
            <SelectItem disabled value="none" className="cursor-default">
              No teachers found
            </SelectItem>
          ) : (
            teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
