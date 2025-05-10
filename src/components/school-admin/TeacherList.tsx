
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export interface Teacher {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  status?: string;
  is_supervisor?: boolean;
}

interface TeacherListProps {
  teachers: Teacher[];
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
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teachers.map((teacher) => (
          <TableRow key={teacher.id}>
            <TableCell className="font-medium">{teacher.full_name || 'Not set'}</TableCell>
            <TableCell>{teacher.email}</TableCell>
            <TableCell>
              {teacher.status === 'active' ? (
                <Badge variant="success">Active</Badge>
              ) : teacher.status === 'pending' ? (
                <Badge variant="warning">Pending</Badge>
              ) : (
                <Badge variant="outline">Unknown</Badge>
              )}
            </TableCell>
            <TableCell>{format(new Date(teacher.created_at), 'MMM d, yyyy')}</TableCell>
            <TableCell>
              {teacher.is_supervisor ? (
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">Supervisor</Badge>
              ) : (
                <Badge variant="outline">Teacher</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm">View</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TeacherList;
