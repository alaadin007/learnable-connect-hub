
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertCircle, Clock, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Progress } from '@/components/ui/progress';

interface AssessmentResult {
  id: string;
  assessment_id: string;
  student_id: string;
  submitted_at: string;
  score: number;
  time_spent: number;
  completed: boolean;
  assessment: {
    title: string;
    description: string;
    max_score: number;
    teacher: {
      full_name: string;
    };
  };
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
}

interface Option {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
}

interface Response {
  question_id: string;
  selected_option_id: string | null;
  text_response: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
}

const AssessmentResults = () => {
  const { assessmentId, submissionId } = useParams<{ assessmentId: string, submissionId: string }>();
  const navigate = useNavigate();
  
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Record<string, Option[]>>({});
  const [responses, setResponses] = useState<Record<string, Response>>({});
  
  useEffect(() => {
    const fetchResults = async () => {
      if (!assessmentId || !submissionId) return;
      
      try {
        // Fetch submission with assessment details
        const { data: submissionData, error: submissionError } = await supabase
          .from('assessment_submissions')
          .select(`
            *,
            assessment:assessment_id (
              title,
              description,
              max_score,
              teacher:teacher_id (
                full_name
              )
            )
          `)
          .eq('id', submissionId)
          .eq('assessment_id', assessmentId)
          .single();
          
        if (submissionError) {
          toast.error("Failed to load assessment results");
          return;
        }
        
        // Type assertion to make TypeScript happy
        setResult(submissionData as unknown as AssessmentResult);
        
        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('assessment_id', assessmentId)
          .order('created_at');
          
        if (questionsError) {
          toast.error("Failed to load questions");
          return;
        }
        
        setQuestions(questionsData || []);
        
        // Fetch options for all questions
        const allQuestionIds = (questionsData || []).map(q => q.id);
        if (allQuestionIds.length > 0) {
          const { data: optionsData, error: optionsError } = await supabase
            .from('quiz_options')
            .select('*')
            .in('question_id', allQuestionIds);
            
          if (optionsError) {
            toast.error("Failed to load answer options");
            return;
          }
          
          // Group options by question_id
          const optionsByQuestion: Record<string, Option[]> = {};
          (optionsData || []).forEach(option => {
            if (!optionsByQuestion[option.question_id]) {
              optionsByQuestion[option.question_id] = [];
            }
            optionsByQuestion[option.question_id].push(option as Option);
          });
          
          setOptions(optionsByQuestion);
        }
        
        // Fetch user responses
        const { data: responsesData, error: responsesError } = await supabase
          .from('quiz_responses')
          .select('*')
          .eq('submission_id', submissionId);
          
        if (responsesError) {
          toast.error("Failed to load your responses");
          return;
        }
        
        // Convert responses to Record for easier access
        const responsesRecord: Record<string, Response> = {};
        (responsesData || []).forEach(response => {
          responsesRecord[response.question_id] = response as Response;
        });
        
        setResponses(responsesRecord);
        
      } catch (error) {
        console.error('Error fetching results:', error);
        toast.error("An error occurred while loading results");
      }
    };
    
    fetchResults();
  }, [assessmentId, submissionId]);
  
  const formatTime = (seconds: number) => {
    if (!seconds) return '0 min';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getScorePercentage = () => {
    if (!result) return 0;
    return (result.score / result.assessment.max_score) * 100;
  };
  
  const getScoreColor = () => {
    const percentage = getScorePercentage();
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getFeedback = () => {
    const percentage = getScorePercentage();
    if (percentage >= 90) return "Excellent! You have mastered this topic.";
    if (percentage >= 80) return "Great job! You have a strong understanding.";
    if (percentage >= 70) return "Good work! You are on the right track.";
    if (percentage >= 60) return "Not bad, but there's room for improvement.";
    if (percentage >= 50) return "You passed, but should review this material.";
    return "You need to spend more time studying this material.";
  };
  
  if (!result) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="pt-6 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p>Loading results...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{result.assessment.title} - Results</h1>
            <p className="text-gray-500 mt-1">
              Teacher: {result.assessment.teacher.full_name} • 
              Submitted: {format(new Date(result.submitted_at), 'PPp')}
            </p>
          </div>
          <Button onClick={() => navigate('/student/assessments')}>
            Back to All Assessments
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end">
                <span className={`text-4xl font-bold ${getScoreColor()}`}>
                  {result.score}
                </span>
                <span className="text-xl text-gray-500 ml-1">
                  / {result.assessment.max_score}
                </span>
              </div>
              <Progress 
                value={getScorePercentage()} 
                className={`h-2 mt-2 ${getScorePercentage() >= 60 ? "[&>div]:bg-green-500" : "[&>div]:bg-red-500"}`}
              />
              <p className="text-sm mt-2 text-gray-500">
                {Math.round(getScorePercentage())}% correct
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Time Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-2xl font-medium">
                  {formatTime(result.time_spent)}
                </span>
              </div>
              <p className="text-sm mt-2 text-gray-500">
                Average: {formatTime(Math.floor(result.time_spent / questions.length))} per question
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start">
                <Trophy className="h-5 w-5 mr-2 text-yellow-500 mt-1" />
                <p className="text-base">
                  {getFeedback()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
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
                      {question.question_text}
                    </h3>
                    <div className="flex items-center">
                      {isCorrect === true ? (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Correct
                        </Badge>
                      ) : isCorrect === false ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Incorrect
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Ungraded
                        </Badge>
                      )}
                      
                      <span className="ml-2 text-gray-500 text-sm">
                        {response?.points_earned || 0}/{question.points} points
                      </span>
                    </div>
                  </div>
                  
                  {question.question_type === 'short_answer' ? (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Your answer:</p>
                      <div className="bg-gray-50 p-3 rounded-md border">
                        {response?.text_response || "No answer provided"}
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
                  
                  {isCorrect === false && (
                    <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                      <p className="text-sm font-medium text-blue-700 mb-1">Correct answer:</p>
                      {question.question_type === 'short_answer' ? (
                        <p>This question requires teacher grading.</p>
                      ) : (
                        <p>{correctOption?.option_text || "N/A"}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => navigate('/student/assessments')}
            >
              Back to Assessments
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AssessmentResults;
