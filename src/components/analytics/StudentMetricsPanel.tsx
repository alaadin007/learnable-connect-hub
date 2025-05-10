
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface StudentMetrics {
  id: string;
  student_id: string;
  student_name: string;
  email: string;
  total_sessions: number;
  total_minutes: number;
  avg_session_minutes: number;
  total_queries: number;
  queries_per_session: number;
  last_active: string;
}

interface StudentMetricsPanelProps {
  data: StudentMetrics[];
  schoolId?: string;
}

const StudentMetricsPanel: React.FC<StudentMetricsPanelProps> = ({ data, schoolId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('total_sessions');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort data
  const filteredData = data.filter(student => 
    student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (sortOrder === 'asc') {
      return a[sortBy as keyof StudentMetrics] > b[sortBy as keyof StudentMetrics] ? 1 : -1;
    } else {
      return a[sortBy as keyof StudentMetrics] < b[sortBy as keyof StudentMetrics] ? 1 : -1;
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
        <CardTitle>Student Performance</CardTitle>
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
              <SelectItem value="total_sessions">Total Sessions</SelectItem>
              <SelectItem value="total_minutes">Total Time</SelectItem>
              <SelectItem value="avg_session_minutes">Avg Session Length</SelectItem>
              <SelectItem value="total_queries">Total Queries</SelectItem>
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
                <TableHead>Student</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('total_sessions')}>Sessions</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('total_minutes')}>Total Time (min)</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('avg_session_minutes')}>Avg Session (min)</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('total_queries')}>Queries</TableHead>
                <TableHead className="text-right" onClick={() => toggleSort('last_active')}>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length > 0 ? (
                sortedData.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{student.student_name || 'Unnamed Student'}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{student.total_sessions}</TableCell>
                    <TableCell className="text-right">{student.total_minutes}</TableCell>
                    <TableCell className="text-right">{student.avg_session_minutes.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{student.total_queries}</TableCell>
                    <TableCell className="text-right">{new Date(student.last_active).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No student data available
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

export default StudentMetricsPanel;
