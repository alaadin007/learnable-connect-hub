
import React from "react";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { User } from "lucide-react";

interface StudentSelectorProps {
  students: { value: string; label: string }[];
  selectedStudent: string | null;
  onSelectStudent: (studentId: string | null) => void;
}

const StudentSelector: React.FC<StudentSelectorProps> = ({ 
  students, 
  selectedStudent, 
  onSelectStudent
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="student-selector">Select Student</Label>
      <Select 
        onValueChange={onSelectStudent} 
        value={selectedStudent || ""}
      >
        <SelectTrigger className="w-full" id="student-selector">
          <SelectValue placeholder="Select a student" />
        </SelectTrigger>
        <SelectContent>
          {students.length === 0 ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              No students available
            </div>
          ) : (
            students.map((student) => (
              <SelectItem key={student.value} value={student.value}>
                <div className="flex items-center">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{student.label}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StudentSelector;
