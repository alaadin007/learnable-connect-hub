
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Plus, Search, PenSquare, Eye, Trash2, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isPast } from 'date-fns';

const TeacherAssessments: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAssessments, setFilteredAssessments] = useState<any[]>([]);

  const fetchAssessments = async () => {
    if (!profile?.id) {
      toast.error("User profile not found");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          submissions:assessment_submissions(
            id,
            student_id
          )
        `)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process data to count submissions
      const processedData = (data || []).map((assessment) => {
        const uniqueStudents = new Set();
        (assessment.submissions || []).forEach((sub: any) => {
          uniqueStudents.add(sub.student_id);
        });
        
        return {
          ...assessment,
          submission_count: uniqueStudents.size
        };
      });

      setAssessments(processedData || []);
      setFilteredAssessments(processedData || []);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast.error("Failed to load assessments");
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchAssessments();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = assessments.filter(assessment => 
        assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assessment.subject && assessment.subject.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredAssessments(filtered);
    } else {
      setFilteredAssessments(assessments);
    }
  }, [searchTerm, assessments]);

  const handleDeleteAssessment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assessment? This will also delete all student submissions.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Assessment deleted successfully");
      fetchAssessments();
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast.error("Failed to delete assessment");
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    try {
      return format(new Date(dateStr), 'MMM d, yyyy');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (dueDate?: string) => {
    if (!dueDate) return <Badge variant="outline">No deadline</Badge>;
    
    const date = new Date(dueDate);
    const now = new Date();
    
    if (isPast(date)) {
      return <Badge variant="destructive">Past due</Badge>;
    } else {
      // Due in the future
      return <Badge variant="outline">Open</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Assessments</h1>
            <p className="text-gray-500">Create and manage assessments for your students</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search assessments..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button onClick={() => navigate('/teacher/assessments/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAssessments.length === 0 ? (
              searchTerm ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No matching assessments</h3>
                  <p className="text-gray-500">Try a different search term</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-600 mb-1">No assessments yet</h3>
                  <p className="text-gray-500 mb-4">Create your first assessment for students</p>
                  <Button onClick={() => navigate('/teacher/assessments/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assessment
                  </Button>
                </div>
              )
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssessments.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.title}</TableCell>
                      <TableCell>{assessment.subject || '-'}</TableCell>
                      <TableCell>{formatDate(assessment.due_date)}</TableCell>
                      <TableCell>{getStatusBadge(assessment.due_date)}</TableCell>
                      <TableCell>{assessment.submission_count}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/teacher/assessments/${assessment.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Results
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/teacher/assessments/${assessment.id}/edit`)}>
                              <PenSquare className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600" 
                              onClick={() => handleDeleteAssessment(assessment.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssessments;
