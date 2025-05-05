
import React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface TeacherPerformanceData {
  teacher_id: string;
  teacher_name: string;
  assessments_created: number;
  students_assessed: number;
  avg_submissions_per_assessment: number;
  avg_student_score: number;
  completion_rate: number;
}

interface TeacherPerformanceTableProps {
  data: TeacherPerformanceData[];
  isLoading: boolean;
}

export function TeacherPerformanceTable({ data, isLoading }: TeacherPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Performance</CardTitle>
        <CardDescription>
          Assessment creation and student performance metrics by teacher
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableCaption>Teacher performance metrics</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead className="text-right">Assessments Created</TableHead>
                <TableHead className="text-right">Students Assessed</TableHead>
                <TableHead className="text-right">Avg. Submissions</TableHead>
                <TableHead className="text-right">Avg. Score</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((teacher) => (
                  <TableRow key={teacher.teacher_id}>
                    <TableCell className="font-medium">{teacher.teacher_name}</TableCell>
                    <TableCell className="text-right">{teacher.assessments_created}</TableCell>
                    <TableCell className="text-right">{teacher.students_assessed}</TableCell>
                    <TableCell className="text-right">{teacher.avg_submissions_per_assessment.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{teacher.avg_student_score.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{teacher.completion_rate.toFixed(1)}%</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No teacher performance data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
