
import React from 'react';
import { Student } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: string;
  onStudentChange: (studentId: string) => void;
}

const StudentSelector: React.FC<StudentSelectorProps> = ({ students, selectedStudentId, onStudentChange }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between">
          <label htmlFor="student-select" className="font-medium text-sm mb-2 sm:mb-0">
            Select student:
          </label>
          <div className="w-full sm:w-[260px]">
            <Select 
              value={selectedStudentId} 
              onValueChange={onStudentChange}
            >
              <SelectTrigger id="student-select" className="w-full">
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Students</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentSelector;

