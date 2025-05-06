
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
import { SessionData } from "./types";

interface SessionsTableProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
}

const SessionsTable = ({ 
  sessions, 
  title = "Recent Sessions", 
  description = "Latest student learning sessions"
}: SessionsTableProps) => {
  return (
    <Table>
      <TableCaption>{description}</TableCaption>
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
                {session.student_name || session.userName || "Unknown"}
              </TableCell>
              <TableCell>
                {session.topics?.[0] || session.topic || "General"}
              </TableCell>
              <TableCell>
                {session.questions_asked || session.queries || 0}
              </TableCell>
              <TableCell>
                {typeof session.duration === 'string' ? 
                  session.duration : 
                  (session.duration_minutes ? 
                    `${session.duration_minutes} min` : 
                    "N/A")}
              </TableCell>
              <TableCell>
                {session.session_date ? 
                  new Date(session.session_date).toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 
                  "N/A"}
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
  );
};

export default SessionsTable;
