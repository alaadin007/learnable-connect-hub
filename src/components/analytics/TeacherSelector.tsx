
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Teacher } from "./types";

export interface TeacherSelectorProps {
  teachers: Teacher[];
  selectedTeacherId?: string;
  onTeacherSelect: (teacherId: string | undefined) => void;
  isLoading?: boolean;
}

export function TeacherSelector({ 
  teachers, 
  selectedTeacherId, 
  onTeacherSelect,
  isLoading = false
}: TeacherSelectorProps) {
  const handleValueChange = (value: string) => {
    onTeacherSelect(value === "all" ? undefined : value);
  };

  return (
    <div className="w-full">
      <Select 
        value={selectedTeacherId || "all"} 
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading teachers..." : "Select teacher"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading teachers...
            </SelectItem>
          ) : teachers && teachers.length > 0 ? (
            teachers.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {teacher.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-teachers" disabled>
              No teachers available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
