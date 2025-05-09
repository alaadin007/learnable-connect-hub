
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, ArrowLeft, Download, BookOpen, MessageCircle,
  ThumbsUp, ThumbsDown, Share2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface Lecture {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration_minutes: number;
  teacher: {
    id: string;
    full_name: string;
    email: string;
  };
  subject: string;
  upload_date: string;
  resources: LectureResource[];
}

interface LectureResource {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
}

interface LectureProgress {
  id?: string;
  progress: number;
  last_watched: string;
  completed: boolean;
}

const StudentLectureView = () => {
  const { lectureId } = useParams<{ lectureId: string }>();
  const { user, schoolId } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<LectureProgress>({
    progress: 0,
    last_watched: new Date().toISOString(),
    completed: false
  });
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user || !lectureId) {
      navigate("/login");
      return;
    }

    const fetchLecture = async () => {
      setLoading(true);
      try {
        // Fetch lecture details
        const { data: lectureData, error: lectureError } = await supabase
          .from("lectures")
          .select(`
            id, 
            title,
            description,
            video_url,
            duration_minutes,
            teacher_id,
            subject,
            created_at,
            resources:lecture_resources(
              id,
              title,
              file_url,
              file_type
            )
          `)
          .eq("id", lectureId)
          .single();

        if (lectureError) throw lectureError;

        // Get teacher details
        const { data: teacherData, error: teacherError } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", lectureData.teacher_id)
          .single();

        if (teacherError) throw teacherError;

        // Get progress data
        const { data: progressData, error: progressError } = await supabase
          .from("lecture_progress")
          .select("id, progress, last_watched, completed")
          .eq("lecture_id", lectureId)
          .eq("student_id", user.id)
          .maybeSingle();

        if (progressError && progressError.code !== 'PGRST116') {
          throw progressError;
        }

        // Format lecture data
        setLecture({
          id: lectureData.id,
          title: lectureData.title,
          description: lectureData.description,
          video_url: lectureData.video_url,
          duration_minutes: lectureData.duration_minutes,
          teacher: {
            id: lectureData.teacher_id,
            full_name: teacherData.full_name || "Unknown",
            email: teacherData.email || ""
          },
          subject: lectureData.subject,
          upload_date: lectureData.created_at,
          resources: lectureData.resources || []
        });

        // If progress data exists, update state
        if (progressData) {
          setProgress({
            id: progressData.id,
            progress: progressData.progress,
            last_watched: progressData.last_watched,
            completed: progressData.completed
          });
        }

        // Get notes if available
        const { data: notesData } = await supabase
          .from("lecture_notes")
          .select("notes")
          .eq("lecture_id", lectureId)
          .eq("student_id", user.id)
          .maybeSingle();

        if (notesData) {
          setNotes(notesData.notes || "");
        }

      } catch (err: any) {
        console.error("Error fetching lecture:", err);
        setError(err.message || "Failed to load lecture");
        toast.error("Failed to load lecture");
      } finally {
        setLoading(false);
      }
    };

    fetchLecture();

    // Clean up progress tracking on unmount
    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
      saveProgress();
    };
  }, [user, lectureId, navigate, schoolId]);

  const saveProgress = async () => {
    if (!user || !lectureId || !lecture) return;
    
    try {
      const videoElement = videoRef.current;
      if (!videoElement) return;
      
      const currentProgress = Math.round((videoElement.currentTime / videoElement.duration) * 100);
      const isCompleted = currentProgress > 90; // Mark as completed if watched over 90%
      
      const progressUpdate = {
        student_id: user.id,
        lecture_id: lectureId,
        progress: currentProgress,
        last_watched: new Date().toISOString(),
        completed: isCompleted
      };

      if (progress.id) {
        // Update existing progress
        await supabase
          .from("lecture_progress")
          .update({
            progress: currentProgress,
            last_watched: new Date().toISOString(),
            completed: isCompleted || progress.completed
          })
          .eq("id", progress.id);
      } else {
        // Create new progress entry
        const { data } = await supabase
          .from("lecture_progress")
          .insert(progressUpdate)
          .select("id")
          .single();
          
        if (data) {
          setProgress({...progressUpdate, id: data.id});
        }
      }
    } catch (err) {
      console.error("Error saving progress:", err);
    }
  };

  const startProgressTracking = () => {
    // Track progress every 30 seconds
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    
    progressIntervalRef.current = window.setInterval(() => {
      saveProgress();
    }, 30000);
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current;
    const currentProgress = Math.round((videoElement.currentTime / videoElement.duration) * 100);
    
    setProgress(prev => ({
      ...prev,
      progress: currentProgress,
      completed: currentProgress > 90 || prev.completed
    }));
  };

  const handleVideoEnded = () => {
    setProgress(prev => ({
      ...prev,
      progress: 100,
      completed: true
    }));
    saveProgress();
    toast.success("Lecture completed!");
  };

  const saveNotes = async () => {
    if (!user || !lectureId) return;
    
    try {
      const { data: existingNote } = await supabase
        .from("lecture_notes")
        .select("id")
        .eq("lecture_id", lectureId)
        .eq("student_id", user.id)
        .maybeSingle();
        
      if (existingNote) {
        await supabase
          .from("lecture_notes")
          .update({ notes })
          .eq("id", existingNote.id);
      } else {
        await supabase
          .from("lecture_notes")
          .insert({
            student_id: user.id,
            lecture_id: lectureId,
            notes
          });
      }
      
      toast.success("Notes saved successfully!");
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Failed to save notes");
    }
  };

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-learnable-blue" />
            <span className="ml-2">Loading lecture...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-500">{error}</div>
        ) : lecture ? (
          <div className="space-y-6">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/student/lectures")}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lectures
              </Button>
              <h1 className="text-2xl font-bold">{lecture.title}</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardContent className="p-0 relative">
                    <video
                      ref={videoRef}
                      controls
                      autoPlay
                      className="w-full rounded-t-lg aspect-video"
                      src={lecture.video_url}
                      poster="/placeholder.svg"
                      onPlay={startProgressTracking}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onEnded={handleVideoEnded}
                    />
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-500">
                          {progress.completed ? 
                            "Completed" : 
                            `${progress.progress}% complete`
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {lecture.duration_minutes} min
                        </div>
                      </div>
                      <Progress value={progress.progress} className="h-1" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold mb-2">{lecture.title}</h2>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mb-4">
                      <span>Subject: {lecture.subject}</span>
                      <span>•</span>
                      <span>Uploaded: {format(new Date(lecture.upload_date), "MMM d, yyyy")}</span>
                    </div>
                    <p className="text-gray-700 mb-6 whitespace-pre-line">{lecture.description}</p>
                    
                    <div className="flex space-x-4">
                      <Button variant="outline" size="sm" onClick={() => setShowNotes(!showNotes)}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        {showNotes ? "Hide Notes" : "Take Notes"}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Like
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Discuss
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                    
                    {showNotes && (
                      <div className="mt-6">
                        <h3 className="text-lg font-medium mb-2">Lecture Notes</h3>
                        <textarea
                          className="w-full border rounded-md p-3 min-h-[150px]"
                          placeholder="Take notes here..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                        <div className="mt-2 flex justify-end">
                          <Button onClick={saveNotes} size="sm">
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Instructor</h3>
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                        {lecture.teacher.full_name.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <p className="font-medium">{lecture.teacher.full_name}</p>
                        <p className="text-sm text-gray-500">{lecture.teacher.email}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      Contact Instructor
                    </Button>
                  </CardContent>
                </Card>
                
                {lecture.resources && lecture.resources.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg mb-4">Resources</h3>
                      <div className="space-y-3">
                        {lecture.resources.map((resource) => (
                          <div key={resource.id} className="flex justify-between items-center">
                            <span className="text-gray-700">{resource.title}</span>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-4">Related Lectures</h3>
                    <p className="text-gray-500 text-sm">
                      Continue your learning with these related lectures
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <p className="text-center text-gray-400">
                        Loading related content...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <p className="text-xl text-gray-600">Lecture not found.</p>
            <Button 
              onClick={() => navigate("/student/lectures")}
              className="mt-4"
            >
              Return to Lectures
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
};

export default StudentLectureView;
