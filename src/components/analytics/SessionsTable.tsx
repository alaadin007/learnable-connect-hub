
import React from "react";
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
import { SessionData } from "./types";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionsTableProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const SessionsTable = ({ 
  sessions, 
  title = "Recent Sessions", 
  description = "Latest student learning sessions",
  isLoading = false
}: SessionsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
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
            <TableCaption>A list of recent learning sessions</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Queries</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.userName || session.student_name || session.student || "Unknown"}
                    </TableCell>
                    <TableCell>
                      {session.topicOrContent || session.topic_or_content_used || session.topic || session.topics?.[0] || "General"}
                    </TableCell>
                    <TableCell>
                      {session.numQueries || session.questions_asked || session.queries || 0}
                    </TableCell>
                    <TableCell>
                      {session.duration_minutes !== undefined ? 
                        `${session.duration_minutes} min` : 
                        (typeof session.duration === 'number' ? 
                          `${Math.floor(session.duration / 60)} min` : 
                          `${session.duration || 0} min`)}
                    </TableCell>
                    <TableCell>
                      {session.session_date || session.startTime || "N/A"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No sessions recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionsTable;
