
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "./types";

export interface StudentSelectorProps {
  students: Student[];
  selectedStudentId?: string;
  onStudentSelect: (studentId: string | undefined) => void;
  isLoading?: boolean;
}

export function StudentSelector({ 
  students, 
  selectedStudentId, 
  onStudentSelect,
  isLoading = false
}: StudentSelectorProps) {
  const handleValueChange = (value: string) => {
    onStudentSelect(value === "all" ? undefined : value);
  };

  return (
    <div className="w-full">
      <Select 
        value={selectedStudentId || "all"} 
        onValueChange={handleValueChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={isLoading ? "Loading students..." : "Select student"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Students</SelectItem>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading students...
            </SelectItem>
          ) : students && students.length > 0 ? (
            students.map((student) => (
              <SelectItem key={student.id} value={student.id}>
                {student.name}
              </SelectItem>
            ))
          ) : (
            <SelectItem value="no-students" disabled>
              No students available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
