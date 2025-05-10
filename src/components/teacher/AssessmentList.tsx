
import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface AssessmentListProps {
  assessments: any[];
  isLoading: boolean;
  onRefresh?: () => void;
  studentView?: boolean;
}

const AssessmentList = ({ 
  assessments, 
  isLoading, 
  onRefresh,
  studentView = false
}: AssessmentListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No assessments found.</p>
        {onRefresh && (
          <Button 
            variant="outline" 
            className="mt-2" 
            onClick={onRefresh}
          >
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Teacher</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            {!studentView && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assessments.map((assessment) => (
            <TableRow key={assessment.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{assessment.title}</div>
                  {assessment.description && (
                    <div className="text-sm text-muted-foreground truncate max-w-[250px]">
                      {assessment.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{assessment.teacher?.full_name || 'N/A'}</TableCell>
              <TableCell>
                {assessment.due_date 
                  ? format(new Date(assessment.due_date), 'MMM d, yyyy') 
                  : 'No due date'}
              </TableCell>
              <TableCell>
                {assessment.submission ? (
                  assessment.submission.completed ? (
                    <Badge variant="success" className="bg-green-500">Completed</Badge>
                  ) : (
                    <Badge variant="secondary">In Progress</Badge>
                  )
                ) : (
                  <Badge variant="outline">Not Started</Badge>
                )}
              </TableCell>
              {!studentView && (
                <TableCell>
                  <Button variant="outline" size="sm">View</Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AssessmentList;
