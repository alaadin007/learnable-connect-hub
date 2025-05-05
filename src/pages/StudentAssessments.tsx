
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileCheck, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface Assessment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
  teacher: {
    full_name: string | null;
  };
  submission?: {
    id: string;
    score: number | null;
    completed: boolean | null;
    submitted_at: string;
  };
}

const StudentAssessments = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
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

    if (schoolId) {
      fetchAssessments();
    }
  }, [user, profile, schoolId, navigate]);

  const fetchAssessments = async () => {
    try {
      // Fetch assessments for this student's school
      if (!schoolId) return;

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
    }
  };

  const handleTakeAssessment = (assessmentId: string) => {
    navigate(`/student/assessment/${assessmentId}`);
  };

  const handleViewResults = (assessmentId: string, submissionId: string) => {
    navigate(`/student/assessment-results/${assessmentId}/${submissionId}`);
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Assessments</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAssessments}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-500">{error}</div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <p className="text-xl text-gray-600">No assessments assigned yet.</p>
            <p className="text-gray-500 mt-2">Check back later for new assignments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{assessment.title}</CardTitle>
                    {assessment.submission ? (
                      assessment.submission.completed ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">Submitted</Badge>
                      )
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800">Pending</Badge>
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
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default StudentAssessments;
