
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Teacher } from "./types";

export interface TeacherSelectorProps {
  teachers: Teacher[];
  selectedTeacherId?: string;
  onTeacherSelect: (teacherId: string | undefined) => void;
}

export function TeacherSelector({ 
  teachers, 
  selectedTeacherId, 
  onTeacherSelect 
}: TeacherSelectorProps) {
  const handleValueChange = (value: string) => {
    onTeacherSelect(value === "all" ? undefined : value);
  };

  return (
    <div className="w-full">
      <Select 
        value={selectedTeacherId || "all"} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select teacher" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Teachers</SelectItem>
          {teachers.map((teacher) => (
            <SelectItem key={teacher.id} value={teacher.id}>
              {teacher.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
