
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical, Copy, AlertCircle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface QuestionData {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  points: number;
  options: OptionData[];
}

interface OptionData {
  id: string;
  option_text: string;
  is_correct: boolean;
}

const AssessmentCreator = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [dueDate, setDueDate] = useState('');
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const addQuestion = () => {
    const newQuestion: QuestionData = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'multiple_choice',
      points: 10,
      options: [
        { id: `opt_${Date.now()}_1`, option_text: '', is_correct: false },
        { id: `opt_${Date.now()}_2`, option_text: '', is_correct: false },
      ]
    };
    
    setQuestions([...questions, newQuestion]);
  };
  
  const removeQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    setQuestions(updatedQuestions);
  };
  
  const updateQuestion = (index: number, field: keyof QuestionData, value: any) => {
    const updatedQuestions = [...questions];
    
    if (field === 'question_type' && value !== updatedQuestions[index].question_type) {
      if (value === 'true_false') {
        updatedQuestions[index].options = [
          { id: `opt_${Date.now()}_1`, option_text: 'True', is_correct: false },
          { id: `opt_${Date.now()}_2`, option_text: 'False', is_correct: false },
        ];
      } else if (value === 'multiple_choice' && updatedQuestions[index].options.length === 0) {
        updatedQuestions[index].options = [
          { id: `opt_${Date.now()}_1`, option_text: '', is_correct: false },
          { id: `opt_${Date.now()}_2`, option_text: '', is_correct: false },
        ];
      } else if (value === 'short_answer') {
        updatedQuestions[index].options = [];
      }
    }
    
    updatedQuestions[index][field] = value;
    setQuestions(updatedQuestions);
  };
  
  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.push({
      id: `opt_${Date.now()}_${updatedQuestions[questionIndex].options.length + 1}`,
      option_text: '',
      is_correct: false
    });
    
    setQuestions(updatedQuestions);
  };
  
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.splice(optionIndex, 1);
    setQuestions(updatedQuestions);
  };
  
  const updateOption = (questionIndex: number, optionIndex: number, field: keyof OptionData, value: any) => {
    const updatedQuestions = [...questions];
    
    if (field === 'is_correct' && value === true) {
      // If this is multiple choice, uncheck other options
      updatedQuestions[questionIndex].options.forEach((option, idx) => {
        if (idx !== optionIndex) {
          option.is_correct = false;
        }
      });
    }
    
    updatedQuestions[questionIndex].options[optionIndex][field] = value;
    setQuestions(updatedQuestions);
  };
  
  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = { ...questions[index] };
    
    // Create new IDs for question and options
    const newQuestion = {
      ...questionToDuplicate,
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: questionToDuplicate.options.map(opt => ({
        ...opt,
        id: `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }))
    };
    
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index + 1, 0, newQuestion);
    setQuestions(updatedQuestions);
  };
  
  const handleOnDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(questions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setQuestions(items);
  };
  
  const validateForm = () => {
    if (!title.trim()) {
      toast.error("Please provide an assessment title");
      return false;
    }
    
    if (questions.length === 0) {
      toast.error("Add at least one question to the assessment");
      return false;
    }
    
    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      if (!q.question_text.trim()) {
        toast.error(`Question ${i + 1} needs text`);
        return false;
      }
      
      // For multiple choice and true/false, validate options
      if (q.question_type !== 'short_answer') {
        if (q.options.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 options`);
          return false;
        }
        
        if (!q.options.some(opt => opt.is_correct)) {
          toast.error(`Question ${i + 1} needs at least one correct answer`);
          return false;
        }
        
        for (let j = 0; j < q.options.length; j++) {
          if (!q.options[j].option_text.trim()) {
            toast.error(`Question ${i + 1}, Option ${j + 1} needs text`);
            return false;
          }
        }
      }
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!profile?.id) {
      toast.error("You must be logged in to create assessments");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // 1. Create the assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          title,
          description: description || null,
          subject: subject || null,
          max_score: maxScore,
          due_date: dueDate || null,
          teacher_id: profile.id,
          school_id: profile.school_id || '',
        })
        .select()
        .single();
      
      if (assessmentError) throw assessmentError;
      
      // 2. Create all quiz questions
      const questionsToInsert = questions.map(q => ({
        assessment_id: assessmentData.id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points
      }));
      
      const { data: insertedQuestions, error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert)
        .select();
      
      if (questionsError) throw questionsError;
      
      // 3. Create options for each question
      const optionsToInsert: any[] = [];
      
      questions.forEach((q, qIndex) => {
        if (q.question_type === 'short_answer') return;
        
        q.options.forEach(opt => {
          optionsToInsert.push({
            question_id: insertedQuestions[qIndex].id,
            option_text: opt.option_text,
            is_correct: opt.is_correct
          });
        });
      });
      
      if (optionsToInsert.length > 0) {
        const { error: optionsError } = await supabase
          .from('quiz_options')
          .insert(optionsToInsert);
        
        if (optionsError) throw optionsError;
      }
      
      toast.success("Assessment created successfully!");
      navigate('/teacher/assessments');
      
    } catch (error: any) {
      console.error("Error creating assessment:", error);
      toast.error(`Failed to create assessment: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  
  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Create New Assessment</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title*</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Math Quiz Chapter 5"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Mathematics"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxScore">Maximum Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      value={maxScore}
                      min={1}
                      onChange={(e) => setMaxScore(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date (Optional)</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details about this assessment"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Questions</h2>
                <Button onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
              
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-6">
                      {questions.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-8 text-center">
                          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <h3 className="text-lg font-medium text-gray-600 mb-2">No Questions Yet</h3>
                          <p className="text-gray-500 mb-4">Add your first question to start building the assessment</p>
                          <Button onClick={addQuestion}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                      ) : (
                        questions.map((question, index) => (
                          <Draggable key={question.id} draggableId={question.id} index={index}>
                            {(provided) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="relative border-l-4 border-l-blue-500"
                              >
                                <div {...provided.dragHandleProps} className="absolute top-4 left-4 cursor-grab">
                                  <GripVertical className="h-5 w-5 text-gray-400" />
                                </div>
                                <CardHeader className="pl-12">
                                  <CardTitle className="text-lg flex items-center justify-between">
                                    <span>Question {index + 1}</span>
                                    <div className="flex items-center space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => duplicateQuestion(index)}
                                        title="Duplicate question"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeQuestion(index)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        title="Delete question"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                      <Label htmlFor={`question-${index}`}>Question Text*</Label>
                                      <Textarea
                                        id={`question-${index}`}
                                        value={question.question_text}
                                        onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                                        placeholder="Enter your question here"
                                        className="mt-1"
                                      />
                                    </div>
                                    
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor={`question-type-${index}`}>Question Type</Label>
                                        <Select
                                          value={question.question_type}
                                          onValueChange={(value: any) => updateQuestion(index, 'question_type', value)}
                                        >
                                          <SelectTrigger id={`question-type-${index}`} className="mt-1">
                                            <SelectValue placeholder="Select a type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectGroup>
                                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                                              <SelectItem value="true_false">True/False</SelectItem>
                                              <SelectItem value="short_answer">Short Answer</SelectItem>
                                            </SelectGroup>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div>
                                        <Label htmlFor={`question-points-${index}`}>Points</Label>
                                        <Input
                                          id={`question-points-${index}`}
                                          type="number"
                                          value={question.points}
                                          min={1}
                                          onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                                          className="mt-1"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {question.question_type !== 'short_answer' && (
                                    <div className="space-y-3 pt-2">
                                      <Label>Answer Options</Label>
                                      
                                      {question.options.map((option, optIndex) => (
                                        <div key={option.id} className="flex items-center space-x-3">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                              <Input
                                                value={option.option_text}
                                                onChange={(e) => updateOption(index, optIndex, 'option_text', e.target.value)}
                                                placeholder={`Option ${optIndex + 1}`}
                                                className={option.is_correct ? "border-green-500" : ""}
                                              />
                                              
                                              <div className="flex items-center space-x-2">
                                                <Button
                                                  type="button"
                                                  variant={option.is_correct ? "default" : "outline"}
                                                  size="sm"
                                                  className={option.is_correct ? "bg-green-500 hover:bg-green-600" : ""}
                                                  onClick={() => updateOption(index, optIndex, 'is_correct', !option.is_correct)}
                                                >
                                                  {option.is_correct ? "Correct" : "Mark Correct"}
                                                </Button>
                                                
                                                {question.options.length > 2 && (
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => removeOption(index, optIndex)}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {question.question_type === 'multiple_choice' && (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => addOption(index)}
                                        >
                                          <Plus className="h-4 w-4 mr-1" />
                                          Add Option
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
              
              {questions.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <Button onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Assessment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Title</p>
                  <p className="font-medium">{title || 'Untitled Assessment'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Questions</p>
                  <p className="font-medium">{questions.length}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Total Points</p>
                  <p className="font-medium">{totalPoints}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className="font-medium">
                    {dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
                
                {!title.trim() && questions.length === 0 && (
                  <div className="bg-amber-50 p-3 rounded-md border border-amber-200 text-amber-800 text-sm">
                    Add a title and questions to complete your assessment
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !title.trim() || questions.length === 0}
                >
                  Create Assessment
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/teacher/assessments')}
                >
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssessmentCreator;
