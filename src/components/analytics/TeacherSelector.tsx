
import React, { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { safeQueryArray } from "@/utils/supabaseHelpers";

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

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!schoolId) {
        setTeachers([]);
        return;
      }
      
      try {
        // Use our helper function for safer data fetching
        const teachersData = await safeQueryArray(
          supabase
            .from("teachers")
            .select("id")
            .eq("school_id", schoolId)
        );

        if (!teachersData || teachersData.length === 0) {
          setTeachers([]);
          return;
        }

        const teacherIds = teachersData.map((t) => t.id);
        const profilesData = await safeQueryArray(
          supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", teacherIds)
        );

        const formattedTeachers: Teacher[] = profilesData.map(
          (profile) => ({
            id: profile.id,
            name: profile.full_name || "Unknown Teacher",
          })
        );

        setTeachers(formattedTeachers);
      } catch (error) {
        console.error("Error fetching teachers:", error);
        setTeachers([]);
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
        aria-labelledby={labelId}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select teacher..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {teachers.length === 0 ? (
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
