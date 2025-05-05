
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SessionData } from "./types";
import { format, parseISO } from "date-fns";

interface SessionsTableProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions
}) => {
  return (
    <>
      {sessions.length === 0 ? (
        <div className="text-center p-6 text-muted-foreground">
          No sessions found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Queries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    {session.student_name || session.userName || "Unknown"}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(session.session_date), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {session.topic || (session.topics && session.topics.length > 0 
                      ? session.topics.join(", ") 
                      : "Not specified")}
                  </TableCell>
                  <TableCell>{session.duration_minutes} min</TableCell>
                  <TableCell>{session.questions_asked || session.queries || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
};

export default SessionsTable;
