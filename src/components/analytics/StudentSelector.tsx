
import React from "react";
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
  selectedStudent, 
  selectedStudentId,
  onStudentSelect,
  onStudentChange
}: StudentSelectorProps) {
  // Handle both the new and old API
  const handleSelect = (value: string) => {
    if (value === "all") {
      if (onStudentSelect) {
        onStudentSelect(null);
      }
      if (onStudentChange) {
        onStudentChange(undefined);
      }
      return;
    }
    
    // Find the student in the array
    const student = students.find(s => s.id === value);
    
    if (onStudentSelect && student) {
      onStudentSelect(student);
    }
    
    if (onStudentChange) {
      onStudentChange(value);
    }
  };

  return (
    <Select 
      value={selectedStudentId || "all"} 
      onValueChange={handleSelect}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All Students" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Students</SelectItem>
        {Array.isArray(students) && students.map((student) => (
          <SelectItem key={student.id} value={student.id}>
            {student.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
