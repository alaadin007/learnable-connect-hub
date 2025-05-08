
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { StudentPerformanceData } from "./types";

interface StudentPerformanceTableProps {
  data: StudentPerformanceData[];
  isLoading: boolean;
}

export const StudentPerformanceTable = ({ data, isLoading }: StudentPerformanceTableProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
          <CardDescription>Student assessment metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance</CardTitle>
        <CardDescription>Student assessment metrics and performance data</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex justify-center items-center py-10 text-muted-foreground">
            No student performance data available
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Avg. Score</TableHead>
                  <TableHead className="text-right">Assessments Taken</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((student, index) => (
                  <TableRow key={student.id || index}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="text-right">{student.avg_score || student.average_score || 0}%</TableCell>
                    <TableCell className="text-right">{student.assessments_taken || 0}</TableCell>
                    <TableCell className="text-right">{student.completion_rate || 0}%</TableCell>
                    <TableCell>{student.last_active || "Not available"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentPerformanceTable;
