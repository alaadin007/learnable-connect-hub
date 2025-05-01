
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface Session {
  id: string;
  student: string;
  topic: string;
  queries: number;
  duration: string;
  startTime: string;
}

interface SessionsTableProps {
  sessions: Session[];
  title?: string;
  description?: string;
}

const SessionsTable = ({ 
  sessions, 
  title = "Recent Sessions", 
  description = "Details of recent learning sessions" 
}: SessionsTableProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead className="text-right">Queries</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.student}</TableCell>
                  <TableCell>{session.topic || "General"}</TableCell>
                  <TableCell className="text-right">{session.queries}</TableCell>
                  <TableCell className="text-right">{session.duration}</TableCell>
                  <TableCell className="text-right">{session.startTime}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No sessions found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SessionsTable;
