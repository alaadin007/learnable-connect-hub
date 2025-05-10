
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, FileCheck, BookOpen, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import { Assessment } from "@/utils/supabaseHelpers";

const StudentAssessments = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if not logged in or not a student
    if (!user) {
      navigate("/login");
      return;
    }

    if (profile && profile.user_type !== "student") {
      navigate("/dashboard");
      return;
    }

    const fetchAssessments = async () => {
      try {
        // Fetch assessments for this student's school
        if (!schoolId) {
          setAssessments([]);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("assessments")
          .select(`
            id, 
            title, 
            description, 
            due_date, 
            created_at,
            teacher_id,
            teacher:teachers(
              id, 
              profiles(full_name)
            ),
            submission:assessment_submissions(
              id, 
              score, 
              completed,
              submitted_at
            )
          `)
          .eq("school_id", schoolId)
          .order("due_date", { ascending: true });

        if (error) throw error;

        // Process data to format teacher name and submission
        const formattedData = data.map((assessment: any) => {
          // Extract teacher name from nested object
          const teacherFullName = assessment.teacher?.profiles?.length > 0 
            ? assessment.teacher.profiles[0].full_name 
            : "Unknown Teacher";

          // Extract submission data (if any)
          const submission = assessment.submission?.length > 0 
            ? assessment.submission[0] 
            : undefined;

          return {
            ...assessment,
            teacher: {
              full_name: teacherFullName
            },
            submission
          };
        });

        setAssessments(formattedData);
      } catch (err: any) {
        console.error("Error fetching assessments:", err);
        setError(err.message || "Failed to load assessments");
        toast.error("Failed to load assessments");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessments();
  }, [user, profile, schoolId, navigate]);

  const handleTakeAssessment = (assessmentId: string) => {
    navigate(`/student/assessment/${assessmentId}`);
  };

  const handleViewResults = (assessmentId: string, submissionId: string) => {
    navigate(`/student/assessment-results/${assessmentId}/${submissionId}`);
  };

  // Split assessments into upcoming, due soon, and past
  const upcomingAssessments = assessments.filter(assessment => 
    assessment.due_date && 
    !isToday(new Date(assessment.due_date)) && 
    !isPast(new Date(assessment.due_date)) &&
    !assessment.submission
  );
  
  const dueSoonAssessments = assessments.filter(assessment => 
    (assessment.due_date && isToday(new Date(assessment.due_date))) && 
    !assessment.submission
  );
  
  const completedAssessments = assessments.filter(assessment => 
    assessment.submission !== undefined
  );
  
  const pastDueAssessments = assessments.filter(assessment => 
    assessment.due_date && 
    isPast(new Date(assessment.due_date)) && 
    !isToday(new Date(assessment.due_date)) &&
    !assessment.submission
  );

  const renderEmptyState = (message: string) => (
    <div className="text-center py-12 bg-gray-50 rounded-md">
      <p className="text-xl text-gray-600">{message}</p>
    </div>
  );

  const renderAssessmentCard = (assessment: Assessment) => (
    <Card key={assessment.id} className="overflow-hidden">
      <CardHeader className="bg-gray-50 pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{assessment.title}</CardTitle>
          {assessment.submission ? (
            assessment.submission.completed ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">Submitted</Badge>
            )
          ) : assessment.due_date && isPast(new Date(assessment.due_date)) ? (
            <Badge variant="destructive">Past Due</Badge>
          ) : assessment.due_date && isToday(new Date(assessment.due_date)) ? (
            <Badge variant="secondary" className="bg-red-100 text-red-800">Due Today</Badge>
          ) : (
            <Badge variant="outline" className="bg-blue-100 text-blue-800">Upcoming</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-gray-600 mb-4 line-clamp-2">{assessment.description || "No description provided"}</p>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            {assessment.due_date ? (
              <>Due: {format(new Date(assessment.due_date), "MMM d, yyyy")}</>
            ) : (
              <>No due date</>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            Created: {format(new Date(assessment.created_at), "MMM d, yyyy")}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <FileCheck className="h-4 w-4 mr-2" />
            Teacher: {assessment.teacher.full_name}
          </div>
          {assessment.submission?.completed && (
            <div className="mt-2 text-base font-medium">
              Score: {assessment.submission.score !== null ? `${assessment.submission.score}/100` : 'Not scored yet'}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t bg-gray-50">
        {assessment.submission ? (
          <Button 
            onClick={() => handleViewResults(assessment.id, assessment.submission!.id)} 
            className="w-full"
            variant={assessment.submission.completed ? "default" : "outline"}
          >
            View Results
          </Button>
        ) : (
          <Button onClick={() => handleTakeAssessment(assessment.id)} className="w-full">
            Start Assessment
          </Button>
        )}
      </CardFooter>
    </Card>
  );

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-3xl font-bold mb-6">My Assessments</h1>

        {error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-500">{error}</div>
        ) : (
          <Tabs defaultValue="due-soon" className="w-full">
            <TabsList className="mb-6 grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="due-soon">
                Due Soon {dueSoonAssessments.length > 0 && <span className="ml-2 bg-red-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">{dueSoonAssessments.length}</span>}
              </TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="past-due">
                Past Due {pastDueAssessments.length > 0 && <span className="ml-2 bg-red-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">{pastDueAssessments.length}</span>}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="due-soon">
              {loading ? (
                <div className="bg-gray-50 p-8 rounded-md text-center">
                  <p className="text-gray-500">Retrieving your assessments...</p>
                </div>
              ) : dueSoonAssessments.length === 0 ? (
                renderEmptyState("No assessments due today!")
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dueSoonAssessments.map(renderAssessmentCard)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="upcoming">
              {loading ? (
                <div className="bg-gray-50 p-8 rounded-md text-center">
                  <p className="text-gray-500">Retrieving your assessments...</p>
                </div>
              ) : upcomingAssessments.length === 0 ? (
                renderEmptyState("No upcoming assessments.")
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingAssessments.map(renderAssessmentCard)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed">
              {loading ? (
                <div className="bg-gray-50 p-8 rounded-md text-center">
                  <p className="text-gray-500">Retrieving your assessments...</p>
                </div>
              ) : completedAssessments.length === 0 ? (
                renderEmptyState("No completed assessments yet.")
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedAssessments.map(renderAssessmentCard)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="past-due">
              {loading ? (
                <div className="bg-gray-50 p-8 rounded-md text-center">
                  <p className="text-gray-500">Retrieving your assessments...</p>
                </div>
              ) : pastDueAssessments.length === 0 ? (
                renderEmptyState("No past due assessments.")
              ) : (
                <div className="space-y-6">
                  <Card className="border-red-200">
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-4 text-red-600 mb-4">
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                        <div>
                          <h3 className="font-semibold">Past Due Assessments</h3>
                          <p className="text-sm text-red-500">These assessments are past their due date. Contact your teacher if you need to complete them.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pastDueAssessments.map(renderAssessmentCard)}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />
    </>
  );
};

export default StudentAssessments;
