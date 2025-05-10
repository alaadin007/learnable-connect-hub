import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { CheckCircle, Clock, AlertCircle, BookOpen } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
}

interface QuizOption {
  id: string;
  option_text: string;
  question_id: string;
}

interface UserResponse {
  questionId: string;
  selectedOptionId?: string;
  textResponse?: string;
}

const AssessmentTaker = () => {
  const { id: assessmentId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [options, setOptions] = useState<Record<string, QuizOption[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [startTime] = useState<Date>(new Date());
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      if (!assessmentId) return;
      
      // Check for existing submission first
      const { data: submissionData } = await supabase
        .from('assessment_submissions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .eq('student_id', profile?.id)
        .maybeSingle();
        
      if (submissionData?.completed) {
        // If already completed, redirect to results page
        navigate(`/student/assessment/${assessmentId}/results/${submissionData.id}`);
        return;
      }
      
      setExistingSubmission(submissionData);
      
      // Fetch assessment details
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*, teacher:teacher_id (full_name)')
        .eq('id', assessmentId)
        .single();
        
      if (assessmentError) {
        toast.error("Failed to load assessment");
        return;
      }
      
      setAssessment(assessmentData);
      
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
      
      // Initialize user responses
      const initialResponses = (questionsData || []).map(q => ({
        questionId: q.id,
        selectedOptionId: '',
        textResponse: ''
      }));
      
      setUserResponses(initialResponses);
      
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
        const optionsByQuestion: Record<string, QuizOption[]> = {};
        (optionsData || []).forEach(option => {
          if (!optionsByQuestion[option.question_id]) {
            optionsByQuestion[option.question_id] = [];
          }
          optionsByQuestion[option.question_id].push(option);
        });
        
        setOptions(optionsByQuestion);
      }
    };
    
    fetchAssessment();
  }, [assessmentId, navigate, profile?.id]);
  
  const handleOptionSelect = (questionId: string, optionId: string) => {
    setUserResponses(prev => 
      prev.map(response => 
        response.questionId === questionId 
          ? { ...response, selectedOptionId: optionId } 
          : response
      )
    );
  };
  
  const handleTextResponse = (questionId: string, text: string) => {
    setUserResponses(prev => 
      prev.map(response => 
        response.questionId === questionId 
          ? { ...response, textResponse: text } 
          : response
      )
    );
  };
  
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleSubmit = async () => {
    if (!assessment || !profile) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate time spent
      const endTime = new Date();
      const timeSpent = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // in seconds
      
      // Create or update submission
      const submissionId = existingSubmission?.id || undefined;
      
      const { data: submission, error: submissionError } = await supabase
        .from('assessment_submissions')
        .upsert({
          id: submissionId,
          assessment_id: assessmentId!,
          student_id: profile.id,
          completed: true,
          time_spent: timeSpent,
          submitted_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (submissionError) {
        throw new Error(submissionError.message);
      }
      
      // For each response, create an entry in quiz_responses
      const responses = [];
      for (const response of userResponses) {
        // Get the current question
        const question = questions.find(q => q.id === response.questionId);
        
        // For multiple choice, check if selected option is correct
        let isCorrect = null;
        let pointsEarned = 0;
        
        if (question?.question_type === 'multiple_choice' || question?.question_type === 'true_false') {
          if (response.selectedOptionId) {
            // Find the selected option
            const questionOptions = options[response.questionId] || [];
            const selectedOption = questionOptions.find(o => o.id === response.selectedOptionId);
            
            if (selectedOption) {
              // Auto-grade multiple choice questions
              const { data: optionData } = await supabase
                .from('quiz_options')
                .select('is_correct')
                .eq('id', response.selectedOptionId)
                .single();
              
              isCorrect = optionData?.is_correct || false;
              pointsEarned = isCorrect ? (question?.points || 0) : 0;
            }
          }
        }
        
        responses.push({
          submission_id: submission.id,
          question_id: response.questionId,
          selected_option_id: response.selectedOptionId || null,
          text_response: response.textResponse || null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      }
      
      // Insert all responses
      const { error: responsesError } = await supabase
        .from('quiz_responses')
        .insert(responses);
      
      if (responsesError) {
        throw new Error(responsesError.message);
      }
      
      // Calculate the total score
      let totalScore = responses.reduce((sum, r) => sum + (r.points_earned || 0), 0);
      const maxScore = assessment.max_score || questions.reduce((sum, q) => sum + q.points, 0);
      
      // Normalize score to the assessment's max_score
      if (maxScore > 0) {
        const scoreRatio = totalScore / questions.reduce((sum, q) => sum + q.points, 0);
        totalScore = Math.round(scoreRatio * assessment.max_score);
      }
      
      // Update the submission with the score
      await supabase
        .from('assessment_submissions')
        .update({ score: totalScore })
        .eq('id', submission.id);
      
      // Redirect to results page
      toast.success("Assessment submitted successfully!");
      navigate(`/student/assessment/${assessmentId}/results/${submission.id}`);
      
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      toast.error(`Failed to submit: ${error.message}`);
      setIsSubmitting(false);
    }
  };
  
  const currentQuestion = questions[currentQuestionIndex];
  const currentOptions = currentQuestion ? options[currentQuestion.id] || [] : [];
  const currentResponse = userResponses.find(r => r.questionId === currentQuestion?.id);
  
  const isQuestionAnswered = (questionId: string) => {
    const response = userResponses.find(r => r.questionId === questionId);
    if (!response) return false;
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return false;
    
    if (question.question_type === 'short_answer') {
      return !!response.textResponse;
    } else {
      return !!response.selectedOptionId;
    }
  };
  
  if (!assessment || questions.length === 0) {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="pt-6 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-lg font-medium">No questions available</h2>
                <p className="text-gray-500 mt-2">This assessment does not have any questions yet.</p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => navigate('/student/assessments')}
                >
                  Back to Assessments
                </Button>
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
            <h1 className="text-3xl font-bold">{assessment?.title}</h1>
            <p className="text-gray-500 mt-1">Teacher: {assessment?.teacher?.full_name}</p>
          </div>
          <div className="flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-500" />
            <span className="text-gray-500">
              {Math.floor((new Date().getTime() - startTime.getTime()) / 60000)} min
            </span>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-3/4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <CardTitle>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </CardTitle>
                  <div className="text-sm">
                    <span className="font-semibold">{currentQuestion?.points}</span> {currentQuestion?.points === 1 ? 'point' : 'points'}
                  </div>
                </div>
                <Progress value={(currentQuestionIndex + 1) / questions.length * 100} />
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none mb-8">
                  <h3 className="text-xl font-medium mb-4">{currentQuestion?.question_text}</h3>
                  
                  {currentQuestion?.question_type === 'short_answer' ? (
                    <Textarea 
                      placeholder="Type your answer here..." 
                      className="min-h-[150px]"
                      value={currentResponse?.textResponse || ''}
                      onChange={(e) => handleTextResponse(currentQuestion.id, e.target.value)}
                    />
                  ) : (
                    <RadioGroup 
                      value={currentResponse?.selectedOptionId || ''} 
                      onValueChange={(value) => handleOptionSelect(currentQuestion.id, value)}
                      className="space-y-3"
                    >
                      {currentOptions.map(option => (
                        <div key={option.id} className="flex items-start space-x-3 border rounded-md p-4 hover:bg-gray-50">
                          <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                          <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                            {option.option_text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  Previous
                </Button>
                
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button onClick={nextQuestion}>
                    Next Question
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || userResponses.some(r => !isQuestionAnswered(r.questionId))}
                  >
                    Submit Assessment
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
          
          <div className="md:w-1/4">
            <Card>
              <CardHeader>
                <CardTitle>Question Navigator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {questions.map((question, index) => (
                    <Button
                      key={question.id}
                      variant={currentQuestionIndex === index ? "default" : "outline"}
                      className={`
                        h-10 w-10 p-0 text-center 
                        ${isQuestionAnswered(question.id) ? "border-green-500 text-green-600 font-medium" : ""}
                      `}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {index + 1}
                      {isQuestionAnswered(question.id) && (
                        <CheckCircle className="h-3 w-3 absolute top-0 right-0 text-green-500" />
                      )}
                    </Button>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <span>Answered</span>
                    </div>
                    <span className="font-medium">
                      {userResponses.filter(r => isQuestionAnswered(r.questionId)).length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-gray-300 mr-2"></div>
                      <span>Unanswered</span>
                    </div>
                    <span className="font-medium">
                      {userResponses.filter(r => !isQuestionAnswered(r.questionId)).length}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                      <span>Total</span>
                    </div>
                    <span className="font-medium">
                      {questions.length}
                    </span>
                  </div>
                </div>
                
                {userResponses.some(r => !isQuestionAnswered(r.questionId)) && (
                  <div className="mt-4 bg-amber-50 p-3 rounded-md border border-amber-200 flex items-center space-x-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-amber-800">
                      Please answer all questions before submitting
                    </span>
                  </div>
                )}
                
                {currentQuestionIndex === questions.length - 1 && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={handleSubmit}
                    disabled={isSubmitting || userResponses.some(r => !isQuestionAnswered(r.questionId))}
                  >
                    Submit Assessment
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssessmentTaker;
