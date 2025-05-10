
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface StudentMetricsPanelProps {
  data: any[];
  schoolId: string | null;
}

const StudentMetricsPanel = ({ data, schoolId }: StudentMetricsPanelProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
          <CardDescription>No student data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-gray-500">
            No student performance data is available. This could be because students haven't completed any assessments yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Performance</CardTitle>
          <CardDescription>Academic performance metrics for all students</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Avg. Score</TableHead>
                <TableHead className="text-right">Assessments</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
                <TableHead>Top Strengths</TableHead>
                <TableHead>Areas to Improve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell>{student.student_name || 'Unknown Student'}</TableCell>
                  <TableCell className="text-right">
                    {student.avg_score ? `${student.avg_score.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {student.assessments_taken || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {student.completion_rate ? `${student.completion_rate.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {student.top_strengths || 'No data'}
                  </TableCell>
                  <TableCell>
                    {student.top_weaknesses || 'No data'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentMetricsPanel;
