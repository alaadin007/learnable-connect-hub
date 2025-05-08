
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

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) {
        setTeachers([]);
        return;
      }

      setIsLoading(true);
      try {
        // First, get teacher IDs with a simple query
        const { data: teachersData, error } = await supabase
          .from("teachers")
          .select("id")
          .eq("school_id", schoolId);

        if (error) {
          console.error("Error fetching teacher IDs:", error);
          toast.error("Failed to load teachers. Please try again.");
          setTeachers([]);
          setIsLoading(false);
          return;
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
          toast.error("Failed to load teacher information. Please try again.");
          setTeachers([]);
          setIsLoading(false);
          return;
        }

        const formattedTeachers: Teacher[] = (profilesData ?? []).map(
          (profile) => ({
            id: profile.id,
            name: profile.full_name || "Unknown Teacher",
          })
        );

        setTeachers(formattedTeachers);
      } catch (error) {
        console.error("Error in TeacherSelector:", error);
        toast.error("An unexpected error occurred. Please try again.");
        setTeachers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, [schoolId]);

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
