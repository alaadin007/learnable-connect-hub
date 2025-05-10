
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Clock, CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface ProfileData {
  full_name: string;
  email: string;
  avatar_url?: string;
}

const TeacherAssessmentSubmission: React.FC = () => {
  const { assessmentId, submissionId } = useParams<{ assessmentId: string, submissionId: string }>();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [options, setOptions] = useState<Record<string, any[]>>({});
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // For manual grading of short answer questions
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  
  useEffect(() => {
    const fetchSubmissionData = async () => {
      if (!assessmentId || !submissionId) return;
      
      try {
        // Fetch assessment details
        const { data: assessmentData, error: assessmentError } = await supabase
          .from('assessments')
          .select('*')
          .eq('id', assessmentId)
          .single();
          
        if (assessmentError) throw assessmentError;
        
        setAssessment(assessmentData);
        
        // Fetch submission with student details
        const { data: submissionData, error: submissionError } = await supabase
          .from('assessment_submissions')
          .select(`
            *,
            student:student_id (
              id,
              profiles:id (
                full_name,
                email,
                avatar_url
              )
            )
          `)
          .eq('id', submissionId)
          .eq('assessment_id', assessmentId)
          .single();
          
        if (submissionError) throw submissionError;
        
        setSubmission(submissionData);
        setFeedback(submissionData.feedback || '');
        
        // Extract student info - with proper type checking to avoid errors
        if (submissionData.student && submissionData.student.profiles) {
          const profileData = submissionData.student.profiles as ProfileData;
          
          setStudent({
            id: submissionData.student_id,
            name: profileData.full_name || 'Unknown Student',
            email: profileData.email || 'No email',
            avatar_url: profileData.avatar_url
          });
        } else {
          // Fallback when profile data is missing
          setStudent({
            id: submissionData.student_id,
            name: 'Unknown Student',
            email: 'No email'
          });
        }
        
        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('created_at');
          
        if (questionsError) throw questionsError;
        
        setQuestions(questionsData || []);
        
        // Fetch options for all questions
        const allQuestionIds = (questionsData || []).map(q => q.id);
        if (allQuestionIds.length > 0) {
          const { data: optionsData, error: optionsError } = await supabase
            .from('quiz_options')
            .select('*')
            .in('question_id', allQuestionIds);
            
          if (optionsError) throw optionsError;
          
          // Group options by question_id
          const optionsByQuestion: Record<string, any[]> = {};
          (optionsData || []).forEach(option => {
            if (!optionsByQuestion[option.question_id]) {
              optionsByQuestion[option.question_id] = [];
            }
            optionsByQuestion[option.question_id].push(option);
          });
          
          setOptions(optionsByQuestion);
        }
        
        // Fetch responses
        const { data: responsesData, error: responsesError } = await supabase
          .from('quiz_responses')
          .select('*')
          .eq('submission_id', submissionId);
          
        if (responsesError) throw responsesError;
        
        // Convert responses to Record for easier access
        const responsesRecord: Record<string, any> = {};
        const initialScores: Record<string, number> = {};
        
        (responsesData || []).forEach(response => {
          responsesRecord[response.question_id] = response;
          
          // Initialize manual scores with existing points_earned for short answer questions
          if (response.points_earned !== null) {
            initialScores[response.question_id] = response.points_earned;
          }
        });
        
        setResponses(responsesRecord);
        setManualScores(initialScores);
        
      } catch (error) {
        console.error("Error fetching submission data:", error);
        toast.error("Failed to load submission data");
      }
    };
    
    fetchSubmissionData();
  }, [assessmentId, submissionId]);
  
  const handleScoreChange = (questionId: string, points: number) => {
    setManualScores({
      ...manualScores,
      [questionId]: points
    });
  };
  
  const calculateTotalScore = () => {
    let totalPoints = 0;
    
    // Calculate points from automatically graded questions
    questions.forEach(question => {
      const response = responses[question.id];
      
      if (question.question_type === 'short_answer') {
        // Use manually assigned points for short answer
        totalPoints += manualScores[question.id] || 0;
      } else if (response && response.is_correct) {
        // Use stored points for automatically graded questions
        totalPoints += response.points_earned || 0;
      }
    });
    
    return totalPoints;
  };
  
  const calculateMaxPoints = () => {
    return questions.reduce((total, q) => total + q.points, 0);
  };
  
  const handleSaveFeedback = async () => {
    if (!submissionId) return;
    
    setIsSaving(true);
    
    try {
      const totalPoints = calculateTotalScore();
      const maxScore = assessment.max_score;
      const maxPoints = calculateMaxPoints();
      
      // Calculate normalized score based on max_score
      const normalizedScore = Math.round((totalPoints / maxPoints) * maxScore);
      
      // Update submission with feedback and score
      const { error: submissionError } = await supabase
        .from('assessment_submissions')
        .update({
          feedback,
          score: normalizedScore
        })
        .eq('id', submissionId);
      
      if (submissionError) throw submissionError;
      
      // Update response points for short answer questions
      const shortAnswerPromises = questions
        .filter(q => q.question_type === 'short_answer')
        .map(question => {
          const responseId = responses[question.id]?.id;
          if (!responseId) return null;
          
          return supabase
            .from('quiz_responses')
            .update({
              points_earned: manualScores[question.id] || 0,
              is_correct: (manualScores[question.id] || 0) > 0
            })
            .eq('id', responseId);
        })
        .filter(Boolean);
      
      await Promise.all(shortAnswerPromises);
      
      toast.success("Feedback and scoring saved successfully");
      
      // Update local state
      setSubmission({
        ...submission,
        feedback,
        score: normalizedScore
      });
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast.error("Failed to save feedback");
    } finally {
      setIsSaving(false);
    }
  };
  
  const formatTime = (seconds: number) => {
    if (!seconds) return '0 min';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  if (!assessment || !submission) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <div className="text-center py-12">
            <p>Loading submission details...</p>
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
            onClick={() => navigate(`/teacher/assessments/${assessmentId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Results
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold">{assessment.title}</h1>
            <p className="text-gray-500 mt-1">
              {assessment.subject || 'No subject'} • 
              Student: {student?.name}
            </p>
          </div>
          
          <div className="flex items-center">
            <Badge variant={submission.completed ? 'success' : 'outline'}>
              {submission.completed ? 'Completed' : 'In Progress'}
            </Badge>
            <span className="mx-2">•</span>
            <span className="text-gray-500">
              Submitted: {format(new Date(submission.submitted_at), 'PPp')}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Student
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                  {student?.avatar_url ? (
                    <img src={student.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <User className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <div>
                  <div className="font-medium">{student?.name}</div>
                  <div className="text-xs text-gray-500">{student?.email}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Score
              </CardTitle>
              <div className="space-x-1 text-xs">
                <Badge variant="outline">
                  {calculateTotalScore()} / {calculateMaxPoints()} pts
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline">
                <div className="text-2xl font-bold">
                  {submission.score}
                </div>
                <div className="text-sm text-gray-500 ml-1">
                  / {assessment.max_score}
                </div>
              </div>
              <Progress 
                value={(submission.score / assessment.max_score) * 100}
                className="h-1 mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((submission.score / assessment.max_score) * 100)}%
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Time Spent
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(submission.time_spent || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Average: {questions.length ? formatTime(Math.floor((submission.time_spent || 0) / questions.length)) : '0:00'} per question
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Questions and Responses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {questions.map((question, index) => {
                  const questionOptions = options[question.id] || [];
                  const response = responses[question.id];
                  const isCorrect = response?.is_correct;
                  const selectedOption = questionOptions.find(o => o.id === response?.selected_option_id);
                  const correctOption = questionOptions.find(o => o.is_correct);
                  
                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex justify-between mb-4">
                        <h3 className="text-lg font-medium flex items-start">
                          <span className="bg-gray-100 text-gray-700 rounded-full h-6 w-6 flex items-center justify-center text-sm mr-2">
                            {index + 1}
                          </span>
                          <span>
                            {question.question_text}
                            <span className="block text-sm text-gray-500 mt-1">
                              {question.question_type === 'multiple_choice' ? 'Multiple Choice' : 
                               question.question_type === 'true_false' ? 'True/False' : 
                               'Short Answer'} • {question.points} points
                            </span>
                          </span>
                        </h3>
                        <div className="flex items-center">
                          {isCorrect === true ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Correct
                            </Badge>
                          ) : isCorrect === false ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Incorrect
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Ungraded
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {question.question_type === 'short_answer' ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Student's answer:</p>
                            <div className="bg-gray-50 p-3 rounded-md border">
                              {response?.text_response || "No answer provided"}
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`score-${question.id}`} className="text-sm font-medium">
                              Assign points (max: {question.points})
                            </Label>
                            <div className="flex items-center mt-1">
                              <Input
                                id={`score-${question.id}`}
                                type="number"
                                min="0"
                                max={question.points}
                                value={manualScores[question.id] || 0}
                                onChange={(e) => handleScoreChange(question.id, Math.min(parseInt(e.target.value) || 0, question.points))}
                                className="w-24"
                              />
                              <span className="text-gray-500 ml-2">/ {question.points}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {questionOptions.map(option => {
                            const isSelected = option.id === response?.selected_option_id;
                            const isCorrectOption = option.is_correct;
                            
                            let className = "flex items-center p-3 rounded-md border ";
                            
                            if (isSelected) {
                              if (isCorrectOption) {
                                className += "bg-green-50 border-green-300";
                              } else {
                                className += "bg-red-50 border-red-300";
                              }
                            } else if (isCorrectOption) {
                              className += "bg-green-50 border-green-300";
                            } else {
                              className += "bg-gray-50";
                            }
                            
                            return (
                              <div key={option.id} className={className}>
                                <div className="flex-1">{option.option_text}</div>
                                
                                {isSelected && isCorrectOption && (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                )}
                                
                                {isSelected && !isCorrectOption && (
                                  <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                
                                {!isSelected && isCorrectOption && (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  className="min-h-[120px]"
                />
                
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-2">Score Summary</h3>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Raw Points:</span>
                      <span className="font-medium">{calculateTotalScore()} / {calculateMaxPoints()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Normalized Score:</span>
                      <span className="font-medium">
                        {Math.round((calculateTotalScore() / calculateMaxPoints()) * assessment.max_score)} / {assessment.max_score}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Percentage:</span>
                      <span className="font-medium">
                        {Math.round((calculateTotalScore() / calculateMaxPoints()) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={handleSaveFeedback}
                  disabled={isSaving}
                >
                  Save Feedback & Score
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAssessmentSubmission;
