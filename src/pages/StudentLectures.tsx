
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Search, BookOpen, Video, Clock, Play, User, Calendar, CheckCircle, RefreshCcw
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Lecture {
  id: string;
  title: string;
  description: string;
  video_url: string;
  duration_minutes: number;
  teacher: {
    full_name: string;
  };
  subject: string;
  upload_date: string;
  thumbnail_url: string | null;
  progress?: {
    progress: number;
    last_watched: string;
    completed: boolean;
  };
}

const StudentLectures = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dataFetched, setDataFetched] = useState(false);

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

    fetchLectures();
  }, [user, profile, schoolId, navigate]);

  const fetchLectures = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch lectures for this student's school
      if (!schoolId) {
        setError("School information not available. Please contact support.");
        setLoading(false);
        setDataFetched(true);
        return;
      }

      // Get lectures with progress data
      const { data, error } = await supabase
        .from("lectures")
        .select(`
          id, 
          title,
          description,
          video_url,
          duration_minutes,
          teacher:teacher_id(
            profiles(full_name)
          ),
          subject,
          created_at,
          thumbnail_url,
          lecture_progress:lecture_progress(
            progress,
            last_watched,
            completed
          )
        `)
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process data to format teacher name and progress
      const formattedData = data ? data.map((lecture: any) => {
        // Extract teacher name from nested object
        const teacherFullName = lecture.teacher?.profiles?.length > 0 
          ? lecture.teacher.profiles[0].full_name 
          : "Unknown Teacher";

        // Extract progress data (if any)
        const progress = lecture.lecture_progress?.length > 0 
          ? lecture.lecture_progress[0] 
          : undefined;

        return {
          id: lecture.id,
          title: lecture.title,
          description: lecture.description,
          video_url: lecture.video_url,
          duration_minutes: lecture.duration_minutes,
          teacher: {
            full_name: teacherFullName
          },
          subject: lecture.subject,
          upload_date: lecture.created_at,
          thumbnail_url: lecture.thumbnail_url,
          progress: progress
        };
      }) : [];

      setLectures(formattedData);
      setDataFetched(true);
    } catch (err: any) {
      console.error("Error fetching lectures:", err);
      setError(err.message || "Failed to load lectures");
      toast.error("Failed to load lectures");
      setDataFetched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchLectures();
  };

  const handleWatchLecture = (lectureId: string) => {
    navigate(`/student/lecture/${lectureId}`);
  };

  // Filter lectures based on search query
  const filteredLectures = lectures.filter(lecture => 
    lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecture.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecture.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecture.teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Categorize lectures
  const inProgressLectures = filteredLectures.filter(lecture => 
    lecture.progress && lecture.progress.progress > 0 && !lecture.progress.completed
  );
  
  const completedLectures = filteredLectures.filter(lecture => 
    lecture.progress && lecture.progress.completed
  );
  
  const notStartedLectures = filteredLectures.filter(lecture => 
    !lecture.progress || lecture.progress.progress === 0
  );

  const renderLectureCard = (lecture: Lecture) => (
    <Card key={lecture.id} className="overflow-hidden flex flex-col">
      <div className="aspect-video relative bg-gray-100">
        {lecture.thumbnail_url ? (
          <img 
            src={lecture.thumbnail_url} 
            alt={lecture.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Video className="h-12 w-12" />
          </div>
        )}
        {lecture.progress && (
          <div className="absolute bottom-0 left-0 right-0">
            <Progress value={lecture.progress.progress} className="h-1 rounded-none" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {lecture.progress?.completed ? (
            <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
          ) : lecture.progress?.progress && lecture.progress.progress > 0 ? (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Progress</Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-800">New</Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{lecture.title}</CardTitle>
        <CardDescription className="flex items-center text-sm">
          <User className="h-3 w-3 mr-1" />
          {lecture.teacher.full_name}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 flex-grow">
        <p className="text-gray-600 mb-4 text-sm line-clamp-2">{lecture.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {lecture.duration_minutes} min
          </div>
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {format(new Date(lecture.upload_date), "MMM d, yyyy")}
          </div>
          <div className="px-2 py-0.5 bg-gray-100 rounded-full">
            {lecture.subject}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button 
          onClick={() => handleWatchLecture(lecture.id)} 
          className="w-full"
          variant={lecture.progress?.completed ? "outline" : "default"}
        >
          {lecture.progress?.completed ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Watch Again
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              {lecture.progress?.progress && lecture.progress.progress > 0 ? "Continue Watching" : "Start Watching"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">My Lectures</h1>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search lectures..."
              className="pl-9 pr-4 py-2 w-full border rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-learnable-blue" />
            <span className="ml-2">Loading lectures...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-6 rounded-md text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              className="flex items-center mx-auto"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : dataFetched && lectures.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-md">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-600">No lectures available yet.</p>
            <p className="text-gray-500 mt-2">Check back later for new content.</p>
          </div>
        ) : (
          <Tabs defaultValue="in-progress" className="w-full">
            <TabsList className="mb-6 grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="in-progress">
                In Progress {inProgressLectures.length > 0 && 
                  <span className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">
                    {inProgressLectures.length}
                  </span>
                }
              </TabsTrigger>
              <TabsTrigger value="not-started">Not Started</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="in-progress">
              {inProgressLectures.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-md">
                  <p className="text-xl text-gray-600">No lectures in progress.</p>
                  {notStartedLectures.length > 0 && (
                    <p className="text-gray-500 mt-2">
                      Start watching lectures from the "Not Started" tab.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {inProgressLectures.map(renderLectureCard)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="not-started">
              {notStartedLectures.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-md">
                  <p className="text-xl text-gray-600">No new lectures to watch.</p>
                  <p className="text-gray-500 mt-2">You've started all available lectures.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {notStartedLectures.map(renderLectureCard)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="completed">
              {completedLectures.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-md">
                  <p className="text-xl text-gray-600">No completed lectures yet.</p>
                  {inProgressLectures.length > 0 && (
                    <p className="text-gray-500 mt-2">
                      Continue watching your in-progress lectures.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {completedLectures.map(renderLectureCard)}
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

export default StudentLectures;
