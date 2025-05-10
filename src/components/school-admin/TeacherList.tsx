
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface TeacherListProps {
  teachers: any[];
  onRefresh: () => void;
  isLoading: boolean;
  isPending?: boolean;
}

const TeacherList = ({ teachers, onRefresh, isLoading, isPending = false }: TeacherListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!teachers.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        {isPending ? 
          "No pending invitations found." : 
          "No teachers found. Invite teachers using the button above."}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teachers.map((teacher) => (
          <TableRow key={teacher.id}>
            <TableCell className="font-medium">
              {teacher.full_name || teacher.email || 'Unknown'}
            </TableCell>
            <TableCell>{teacher.email}</TableCell>
            <TableCell>
              {isPending ? (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                  Pending
                </Badge>
              ) : teacher.is_supervisor ? (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  Supervisor
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  Active
                </Badge>
              )}
            </TableCell>
            <TableCell>
              {teacher.created_at ? format(new Date(teacher.created_at), 'MMM d, yyyy') : 'N/A'}
            </TableCell>
            <TableCell>
              {isPending ? (
                <Button size="sm" variant="outline">
                  Resend Invite
                </Button>
              ) : (
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TeacherList;
