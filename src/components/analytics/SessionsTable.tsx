
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { SessionData } from "./types";

interface SessionsTableProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
}

const SessionsTable = ({ 
  sessions, 
  title = "Recent Learning Sessions",
  description = "Latest student learning sessions"
}: SessionsTableProps) => {
  return (
    <Card>
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
                  <TableCell>{session.topic}</TableCell>
                  <TableCell className="text-right">{session.queries}</TableCell>
                  <TableCell className="text-right">{session.duration}</TableCell>
                  <TableCell className="text-right">{session.startTime}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No sessions found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SessionsTable;
