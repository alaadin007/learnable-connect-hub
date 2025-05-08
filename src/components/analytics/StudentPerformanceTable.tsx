
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { StudentPerformanceMetric } from './types';

export interface StudentPerformanceTableProps {
  students: StudentPerformanceMetric[];
}

export function StudentPerformanceTable({ students }: StudentPerformanceTableProps) {
  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student Name</TableHead>
            <TableHead className="text-right">Avg Score</TableHead>
            <TableHead className="text-right">Assessments</TableHead>
            <TableHead className="text-right">Completion Rate</TableHead>
            <TableHead>Strengths</TableHead>
            <TableHead>Areas for Improvement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length > 0 ? (
            students.map((student) => (
              <TableRow key={student.student_id}>
                <TableCell className="font-medium">{student.student_name}</TableCell>
                <TableCell className="text-right">
                  {student.avg_score ? `${student.avg_score}%` : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  {student.assessments_taken}
                </TableCell>
                <TableCell className="text-right">
                  {student.completion_rate ? `${student.completion_rate}%` : 'N/A'}
                </TableCell>
                <TableCell>
                  {student.top_strengths || 'No data'}
                </TableCell>
                <TableCell>
                  {student.top_weaknesses || 'No data'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-4">
                No student data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default StudentPerformanceTable;
