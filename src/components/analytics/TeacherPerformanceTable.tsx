import React from 'react';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface TeacherPerformanceTableProps {
  schoolId: string;
  teacherId: string;
  dateRange: DateRange;
}

const TeacherPerformanceTable: React.FC<TeacherPerformanceTableProps> = ({
  schoolId,
  teacherId,
  dateRange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Performance</CardTitle>
        <CardDescription>
          Summary of teacher performance metrics.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Teacher</TableHead>
                <TableHead>Assessments Created</TableHead>
                <TableHead>Students Assessed</TableHead>
                <TableHead>Avg. Student Score</TableHead>
                <TableHead>Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">John Doe</TableCell>
                <TableCell>15</TableCell>
                <TableCell>120</TableCell>
                <TableCell>85%</TableCell>
                <TableCell>92%</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Jane Smith</TableCell>
                <TableCell>12</TableCell>
                <TableCell>110</TableCell>
                <TableCell>88%</TableCell>
                <TableCell>95%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherPerformanceTable;
