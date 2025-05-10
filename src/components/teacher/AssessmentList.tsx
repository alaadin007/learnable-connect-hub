
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  max_score: number;
  subject?: string;
  teacher?: {
    full_name: string;
  };
  submission?: {
    id: string;
    score: number | null;
    completed: boolean;
    submitted_at: string;
  };
}

interface AssessmentListProps {
  assessments: Assessment[];
  isLoading?: boolean;
  isStudent?: boolean;
  onTakeAssessment?: (assessmentId: string) => void;
  onViewResult?: (assessmentId: string, submissionId: string) => void;
}

const AssessmentList: React.FC<AssessmentListProps> = ({
  assessments,
  isLoading = false,
  isStudent = true,
  onTakeAssessment,
  onViewResult,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isStudent ? 'My Assessments' : 'Assigned Assessments'}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-3 w-[200px]" />
                </div>
                <Skeleton className="h-8 w-[100px]" />
              </div>
            ))}
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No assessments found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell className="font-medium">{assessment.title}</TableCell>
                  <TableCell>{assessment.subject || 'General'}</TableCell>
                  <TableCell>{formatDate(assessment.due_date)}</TableCell>
                  <TableCell>
                    {assessment.submission ? (
                      assessment.submission.completed ? (
                        <Badge variant="success">
                          Completed {assessment.submission.score !== null && `(${assessment.submission.score}/${assessment.max_score})`}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">In Progress</Badge>
                      )
                    ) : (
                      <Badge variant="outline">Not Started</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {assessment.submission && assessment.submission.completed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewResult && onViewResult(assessment.id, assessment.submission!.id)}
                      >
                        View Results
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onTakeAssessment && onTakeAssessment(assessment.id)}
                      >
                        {assessment.submission ? 'Continue' : 'Start'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentList;
