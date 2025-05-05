
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Student } from "./types";

export interface StudentSelectorProps {
  students: Student[];
  selectedStudentId?: string;
  onStudentSelect: (studentId: string | undefined) => void;
}

export function StudentSelector({ 
  students, 
  selectedStudentId, 
  onStudentSelect 
}: StudentSelectorProps) {
  const handleValueChange = (value: string) => {
    onStudentSelect(value === "all" ? undefined : value);
  };

  return (
    <div className="w-full">
      <Select 
        value={selectedStudentId || "all"} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select student" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Students</SelectItem>
          {students.map((student) => (
            <SelectItem key={student.id} value={student.id}>
              {student.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
