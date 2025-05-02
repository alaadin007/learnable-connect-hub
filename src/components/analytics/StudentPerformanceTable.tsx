
import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Clock, Award, AlertCircle } from "lucide-react";

export interface StudentPerformanceData {
  student_id: string;
  student_name: string;
  assessments_taken: number;
  avg_score: number;
  avg_time_spent_seconds: number;
  assessments_completed: number;
  completion_rate: number;
  top_strengths: string;
  top_weaknesses: string;
}

interface StudentPerformanceTableProps {
  data: StudentPerformanceData[];
  isLoading: boolean;
}

export function StudentPerformanceTable({ data, isLoading }: StudentPerformanceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const filteredData = searchQuery 
    ? data.filter(student => 
        student.student_name.toLowerCase().includes(searchQuery.toLowerCase()))
    : data;
  
  // Format time spent in a readable format (minutes and seconds)
  const formatTimeSpent = (seconds: number): string => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance</CardTitle>
        <CardDescription>
          Assessment scores and completion metrics by student
        </CardDescription>
        <div className="mt-2">
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
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
            <TableCaption>Student performance metrics</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Assessments Taken</TableHead>
                <TableHead className="text-right">Avg. Score</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
                <TableHead className="text-right">Avg. Time Spent</TableHead>
                <TableHead>Strengths</TableHead>
                <TableHead>Areas for Improvement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">{student.student_name}</TableCell>
                    <TableCell className="text-right">
                      {student.assessments_completed}/{student.assessments_taken}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={`inline-flex items-center ${
                        student.avg_score >= 80 ? 'text-green-600' :
                        student.avg_score >= 60 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        <Award className="h-4 w-4 mr-1" />
                        {student.avg_score ? student.avg_score.toFixed(1) : 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{student.completion_rate.toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTimeSpent(student.avg_time_spent_seconds)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {student.top_strengths || 'No data'}
                    </TableCell>
                    <TableCell>
                      {student.top_weaknesses ? (
                        <div className="inline-flex items-center text-amber-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {student.top_weaknesses}
                        </div>
                      ) : 'No data'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                    {searchQuery ? "No students match your search" : "No student performance data available"}
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
