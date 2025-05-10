
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TeacherMetricsPanelProps {
  data: any[];
  schoolId: string | null;
}

const TeacherMetricsPanel = ({ data, schoolId }: TeacherMetricsPanelProps) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teacher Performance</CardTitle>
          <CardDescription>No teacher data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-6 text-gray-500">
            No teacher performance data is available. This could be because no assessments have been created yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher Performance</CardTitle>
          <CardDescription>Teaching effectiveness and student engagement metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead className="text-right">Assessments Created</TableHead>
                <TableHead className="text-right">Students Assessed</TableHead>
                <TableHead className="text-right">Avg. Student Score</TableHead>
                <TableHead className="text-right">Completion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((teacher) => (
                <TableRow key={teacher.teacher_id}>
                  <TableCell>{teacher.teacher_name || 'Unknown Teacher'}</TableCell>
                  <TableCell className="text-right">
                    {teacher.assessments_created || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {teacher.students_assessed || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    {teacher.avg_student_score ? `${teacher.avg_student_score.toFixed(1)}%` : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    {teacher.completion_rate ? `${teacher.completion_rate.toFixed(1)}%` : 'N/A'}
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

export default TeacherMetricsPanel;
