
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Download, Eye, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const TeacherAssessmentResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchAssessmentData = async () => {
      if (!id) return;
      
      try {
        // Fetch assessment details
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', id)
          .single();
          
        if (assessmentError) throw assessmentError;
        
        setAssessment(assessmentData);
        
        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('assessment_id', id)
          .order('created_at');
          
        if (questionsError) throw questionsError;
        
        setQuestions(questionsData || []);
        
        // Fetch submissions with student details
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('assessment_submissions')
          .select(`
            *,
            student:student_id (
              id,
              profiles:id (
                full_name,
                email
              )
            )
          `)
          .eq('assessment_id', id)
          .order('submitted_at', { ascending: false });
          
        if (submissionsError) throw submissionsError;
        
        // Process submission data
        const processedSubmissions = (submissionsData || []).map(sub => ({
          ...sub,
          student_name: sub.student?.profiles?.full_name || 'Unknown Student',
          student_email: sub.student?.profiles?.email || 'No email'
        }));
        
        setSubmissions(processedSubmissions);
        
      } catch (error) {
        console.error("Error fetching assessment data:", error);
        toast.error("Failed to load assessment data");
      }
    };
    
    fetchAssessmentData();
  }, [id]);
  
  const calculateStats = () => {
    if (submissions.length === 0) {
      return {
        avgScore: 0,
        highestScore: 0,
        lowestScore: 0,
        completionRate: 0
      };
    }
    
    const scores = submissions.filter(s => s.completed).map(s => s.score);
    const avgScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const completedCount = submissions.filter(s => s.completed).length;
    const completionRate = (completedCount / submissions.length) * 100;
    
    return {
      avgScore,
      highestScore,
      lowestScore,
      completionRate
    };
  };
  
  const stats = calculateStats();
  
  const exportToCSV = () => {
    if (!assessment || submissions.length === 0) return;
    
    const headers = ['Student Name', 'Email', 'Score', 'Max Score', 'Percentage', 'Completed', 'Submission Date'];
    const rows = submissions.map(sub => [
      sub.student_name,
      sub.student_email,
      sub.completed ? sub.score : 'Not completed',
      assessment.max_score,
      sub.completed ? `${Math.round((sub.score / assessment.max_score) * 100)}%` : 'N/A',
      sub.completed ? 'Yes' : 'No',
      sub.submitted_at ? format(new Date(sub.submitted_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${assessment.title.replace(/\s+/g, '_')}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <div className="text-center py-12">
            <p>Loading assessment details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex items-center mb-2">
          <Button 
            variant="ghost" 
            className="mr-2 p-0 h-auto" 
            onClick={() => navigate('/teacher/assessments')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Assessments
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">{assessment.title}</h1>
            <p className="text-gray-500 mt-1">
              {assessment.subject || 'No subject'} • 
              {assessment.due_date 
                ? ` Due: ${format(new Date(assessment.due_date), 'PPp')}` 
                : ' No due date'}
            </p>
          </div>
          
          <Button 
            disabled={submissions.length === 0}
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{submissions.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline">
                <div className="text-2xl font-bold mr-2">
                  {stats.avgScore.toFixed(1)}
                </div>
                <div className="text-gray-500">/ {assessment.max_score}</div>
              </div>
              <Progress 
                value={(stats.avgScore / assessment.max_score) * 100}
                className="h-1 mt-2"
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.completionRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{questions.length}</div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Student Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-600 mb-1">No submissions yet</h3>
                <p className="text-gray-500">Students haven't completed this assessment yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.student_name}</div>
                          <div className="text-sm text-gray-500">{submission.student_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.completed ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.completed ? (
                          <div>
                            <span className="font-medium">{submission.score}</span>
                            <span className="text-gray-500"> / {assessment.max_score}</span>
                            <div className="text-xs text-gray-500">
                              {Math.round((submission.score / assessment.max_score) * 100)}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {submission.submitted_at ? (
                          <div>
                            <div>{format(new Date(submission.submitted_at), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-gray-500">{format(new Date(submission.submitted_at), 'h:mm a')}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/teacher/assessments/${id}/submissions/${submission.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
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

export default TeacherAssessmentResults;
