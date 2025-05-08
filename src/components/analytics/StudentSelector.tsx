import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";

interface StudentSelectorProps {
  students: { value: string; label: string }[];
  selectedStudent: string | null;
  onSelectStudent: (studentId: string | null) => void;
  isLoading?: boolean;
}

// Make sure the component is exported as default
const StudentSelector: React.FC<StudentSelectorProps> = ({ students, selectedStudent, onSelectStudent, isLoading }) => {
  return (
    <div>
      <Label htmlFor="student">Select Student</Label>
      <Select onValueChange={onSelectStudent} defaultValue={selectedStudent || ""}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a student" />
        </SelectTrigger>
        <SelectContent>
          {students.map((student) => (
            <SelectItem key={student.value} value={student.value}>
              <User className="mr-2 h-4 w-4" />
              {student.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StudentSelector;
