
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SessionData } from './types';

interface SessionsTableProps {
  sessions: SessionData[];
  title: string;
  description?: string;
  isLoading: boolean;
}

const SessionsTable: React.FC<SessionsTableProps> = ({ 
  sessions, 
  title, 
  description, 
  isLoading 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Queries</TableHead>
                <TableHead>Topic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.student_name || 'Unknown'}</TableCell>
                    <TableCell>{new Date(session.start_time).toLocaleDateString()}</TableCell>
                    <TableCell>{session.duration_minutes} mins</TableCell>
                    <TableCell>{session.queries_count}</TableCell>
                    <TableCell>{session.topic || 'General'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No sessions recorded
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

export default SessionsTable;
