
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface TeacherMetrics {
  id: string;
  teacher_id: string;
  teacher_name: string;
  email: string;
  assigned_students: number;
  active_students: number;
  student_activity_rate: number;
  avg_student_sessions: number;
  avg_student_engagement: number;
  last_active: string;
}

interface TeacherMetricsPanelProps {
  data: TeacherMetrics[];
  schoolId?: string;
}

const TeacherMetricsPanel: React.FC<TeacherMetricsPanelProps> = ({ data, schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('assigned_students');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort data
  const filteredData = data.filter(teacher => 
    teacher.teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a[sortBy as keyof TeacherMetrics] > b[sortBy as keyof TeacherMetrics] ? 1 : -1;
    } else {
      return a[sortBy as keyof TeacherMetrics] < b[sortBy as keyof TeacherMetrics] ? 1 : -1;
    }
  });

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assigned_students">Assigned Students</SelectItem>
              <SelectItem value="active_students">Active Students</SelectItem>
              <SelectItem value="student_activity_rate">Activity Rate</SelectItem>
              <SelectItem value="avg_student_sessions">Avg Sessions</SelectItem>
              <SelectItem value="last_active">Last Active</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('assigned_students')}>Assigned Students</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('active_students')}>Active Students</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('student_activity_rate')}>Activity Rate</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('avg_student_sessions')}>Avg Sessions</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('last_active')}>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length > 0 ? (
                sortedData.map((teacher) => (
                  <TableRow key={teacher.teacher_id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{teacher.teacher_name || 'Unnamed Teacher'}</div>
                        <div className="text-xs text-gray-500">{teacher.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{teacher.assigned_students}</TableCell>
                    <TableCell className="text-right">{teacher.active_students}</TableCell>
                    <TableCell className="text-right">{(teacher.student_activity_rate * 100).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{teacher.avg_student_sessions.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{new Date(teacher.last_active).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No teacher data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherMetricsPanel;
