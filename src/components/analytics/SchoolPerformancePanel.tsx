
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SchoolPerformanceData, SchoolPerformanceSummary } from './types';

interface SchoolPerformancePanelProps {
  data: SchoolPerformanceData[];
  summary: SchoolPerformanceSummary;
  isLoading: boolean;
}

export const SchoolPerformancePanel: React.FC<SchoolPerformancePanelProps> = ({ data, summary, isLoading }) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>School Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-bold mt-1">{summary.total_students}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <p className="text-sm font-medium text-gray-500">Participation Rate</p>
              <p className="text-2xl font-bold mt-1">{(summary.student_participation_rate * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <p className="text-sm font-medium text-gray-500">Average Score</p>
              <p className="text-2xl font-bold mt-1">{summary.avg_score.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <p className="text-sm font-medium text-gray-500">Completion Rate</p>
              <p className="text-2xl font-bold mt-1">{(summary.completion_rate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">Completion Rate</TableHead>
                  <TableHead className="text-right">Student Count</TableHead>
                  <TableHead className="text-right">Assessment Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? (
                  data.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{item.avg_score.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{(item.completion_rate * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{item.student_count}</TableCell>
                      <TableCell className="text-right">{item.assessment_count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No performance data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
