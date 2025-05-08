
import React, { useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "./types";

interface StudentSelectorProps {
  students?: Student[];
  selectedStudent?: Student | null;
  selectedStudentId?: string;
  onStudentSelect?: (student: Student | null) => void;
  onStudentChange?: (studentId: string | undefined) => void;
}

export function StudentSelector({ 
  students = [], 
  selectedStudentId,
  onStudentSelect,
  onStudentChange
}: StudentSelectorProps) {
  const handleSelect = useCallback(
    (value: string) => {
      if (value === "all") {
        onStudentSelect?.(null);
        onStudentChange?.(undefined);
        return;
      }

      const student = students.find(s => s.id === value);
      if (student) {
        onStudentSelect?.(student);
      }
      onStudentChange?.(value);
    },
    [students, onStudentSelect, onStudentChange]
  );

  return (
    <Select 
      value={selectedStudentId ?? "all"} 
      onValueChange={handleSelect}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All Students" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Students</SelectItem>
        {students.map(student => (
          <SelectItem key={student.id} value={student.id}>
            {student.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
