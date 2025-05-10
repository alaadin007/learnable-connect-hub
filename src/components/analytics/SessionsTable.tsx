
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SessionData } from './types';

export interface SessionsTableProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
  isLoading: boolean;
}

const SessionsTable: React.FC<SessionsTableProps> = ({ 
  sessions, 
  title = "Recent Sessions", 
  description
}) => {
  return (
    <div>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-medium">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
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
    </div>
  );
};

export default SessionsTable;
