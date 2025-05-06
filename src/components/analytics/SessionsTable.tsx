import React from "react";
import { SessionData } from "./types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

// Include isLoading prop in the interface
interface SessionsTableProps {
  sessions: SessionData[];
  title?: string;
  description?: string;
  isLoading?: boolean;
}

const SessionsTable = ({ sessions, title, description, isLoading = false }: SessionsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || "Sessions"}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <Input placeholder="Search sessions..." className="max-w-sm" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex justify-center items-center py-10 text-muted-foreground">
            No sessions available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Student</th>
                  <th className="text-left py-2 px-4">Date</th>
                  <th className="text-left py-2 px-4">Topic</th>
                  <th className="text-right py-2 px-4">Duration</th>
                  <th className="text-right py-2 px-4">Queries</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id} className="border-b">
                    <td className="py-2 px-4">{session.student_name}</td>
                    <td className="py-2 px-4">{session.session_date}</td>
                    <td className="py-2 px-4">{session.topic}</td>
                    <td className="py-2 px-4 text-right">{session.duration_minutes}</td>
                    <td className="py-2 px-4 text-right">{session.queries}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionsTable;
