import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, TextQuote, Video, PlayCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lecture, LectureResource, Transcript, TranscriptData } from '@/utils/supabaseHelpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserSchoolId } from '@/utils/apiHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import { getAiProvider, isApiKeyConfigured } from '@/integrations/supabase/client';

const StudentLectureView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [resources, setResources] = useState<LectureResource[]>([]);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState(-1);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('video');

  // Function to save the current progress
  const saveProgress = async (currentTime: number, duration: number) => {
    if (!id || isSavingProgress) return;
    
    try {
      setIsSavingProgress(true);
      const progressPercent = Math.floor((currentTime / duration) * 100);
      const completed = progressPercent >= 90; // Consider completed if watched 90% or more
      
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          lecture_id: id,
          student_id: (await supabase.auth.getUser()).data.user?.id || '',
          progress: progressPercent,
          last_watched: new Date().toISOString(),
          completed
        });
        
      if (error) {
        console.error("Error saving progress:", error);
      }
    } catch (err) {
      console.error("Failed to save progress:", err);
    } finally {
      setIsSavingProgress(false);
    }
  };

  // Handle time update event on the video player
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration || 1;
      
      // Update the progress state
      const newProgress = Math.floor((currentTime / duration) * 100);
      setProgress(newProgress);
      
      // Save progress every 10 seconds
      if (Math.floor(currentTime) % 10 === 0) {
        saveProgress(currentTime, duration);
      }
      
      // Find the current transcript segment
      const index = transcript.findIndex(
        seg => currentTime >= seg.start_time && currentTime <= seg.end_time
      );
      
      if (index !== currentTranscriptIndex) {
        setCurrentTranscriptIndex(index);
      }
    }
  };

  // Handle video end event
  const handleVideoEnded = () => {
    if (videoRef.current) {
      saveProgress(videoRef.current.duration, videoRef.current.duration);
    }
  };

  // Navigate to timestamp when clicking on transcript
  const goToTimestamp = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(err => console.error("Error playing video:", err));
      setActiveTab('video');
    }
  };

  // Load lecture data and transcript
  useEffect(() => {
    const fetchLectureData = async () => {
      if (!id) {
        setError("No lecture ID provided");
        setLoading(false);
        return;
      }

      try {
        // Get the lecture data
        const { data: lectureData, error: lectureError } = await supabase
          .from('lectures')
          .select('*')
          .eq('id', id)
          .single();
          
        if (lectureError) {
          throw lectureError;
        }
        
        if (!lectureData) {
          throw new Error("Lecture not found");
        }
        
        setLecture(lectureData);
        
        // Get resources for the lecture
        const { data: resourceData, error: resourceError } = await supabase
          .from('lecture_resources')
          .select('*')
          .eq('lecture_id', id);
          
        if (!resourceError && resourceData) {
          setResources(resourceData);
        }

        // Try to fetch transcript data from the database directly
        try {
          // Use a direct query instead of RPC function
          const { data: transcriptData, error: transcriptError } = await supabase
            .from('lecture_transcripts')
            .select('*')
            .eq('lecture_id', id)
            .order('start_time');

          if (transcriptError) {
            console.error('Error fetching transcripts:', transcriptError);
            // Continue without transcripts rather than failing the whole page
          } else if (transcriptData) {
            // Convert the data to the expected Transcript format
            if (Array.isArray(transcriptData)) {
              setTranscript(transcriptData.map(item => ({
                id: item.id,
                lecture_id: item.lecture_id,
                text: item.text,
                start_time: item.start_time,
                end_time: item.end_time,
                created_at: item.created_at
              })));
            } else {
              console.warn('Unexpected transcript data format:', transcriptData);
              // Initialize with an empty array if the format is unexpected
              setTranscript([]);
            }
          }
        } catch (transcriptErr) {
          console.error('Error processing transcripts:', transcriptErr);
          // Continue without transcripts rather than failing the whole page
          setTranscript([]);
        }
      } catch (err: any) {
        console.error('Error fetching lecture data:', err);
        setError(err.message || "Failed to load lecture");
      } finally {
        setLoading(false);
      }
    };

    fetchLectureData();
  }, [id]);

  // Load the existing progress
  useEffect(() => {
    const fetchProgress = async () => {
      if (!id) return;
      
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user?.id) return;
        
        const { data: progressData, error: progressError } = await supabase
          .from('lecture_progress')
          .select('progress, last_watched')
          .eq('lecture_id', id)
          .eq('student_id', user.user.id)
          .single();
          
        if (!progressError && progressData) {
          setProgress(progressData.progress);
          
          // If there's a stored progress, set the video time
          if (videoRef.current && progressData.progress > 0) {
            const duration = videoRef.current.duration;
            if (duration) {
              videoRef.current.currentTime = (progressData.progress / 100) * duration;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching progress:", err);
        // Non-critical, continue without progress data
      }
    };
    
    if (!loading) {
      fetchProgress();
    }
  }, [id, loading]);

  // Format seconds into MM:SS format
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lectures
          </Button>
          
          <div className="w-full aspect-video bg-gray-200 rounded-lg mb-6">
            <Skeleton className="w-full h-full" />
          </div>
          
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !lecture) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error Loading Lecture</h2>
            <p className="text-gray-600 mb-6">{error || "Lecture not found"}</p>
            <Button 
              onClick={() => navigate('/student/lectures')}
            >
              Return to Lectures
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/student/lectures')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Lectures
        </Button>
        
        <h1 className="text-3xl font-bold mb-2">{lecture.title}</h1>
        <p className="text-gray-600 mb-4">{lecture.description}</p>
        
        <div className="mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500 mt-1">{progress}% complete</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="video" className="flex items-center">
              <Video className="mr-2 h-4 w-4" />
              Video
            </TabsTrigger>
            <TabsTrigger value="transcript" className="flex items-center">
              <TextQuote className="mr-2 h-4 w-4" />
              Transcript
            </TabsTrigger>
            {resources.length > 0 && (
              <TabsTrigger value="resources" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                Resources
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="video" className="focus:outline-none">
            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
              <video
                ref={videoRef}
                controls
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnded}
                poster={lecture.thumbnail_url || undefined}
              >
                <source src={lecture.video_url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </TabsContent>
          
          <TabsContent value="transcript" className="focus:outline-none">
            <div className="bg-white rounded-lg shadow-md p-4 max-h-[600px] overflow-y-auto">
              {transcript.length > 0 ? (
                transcript.map((segment, index) => (
                  <div 
                    key={segment.id}
                    className={`p-3 mb-2 rounded cursor-pointer transition-colors ${
                      index === currentTranscriptIndex ? 'bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => goToTimestamp(segment.start_time)}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-blue-600">
                        {formatTime(segment.start_time)} - {formatTime(segment.end_time)}
                      </span>
                      <PlayCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-gray-800">{segment.text}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TextQuote className="mx-auto h-12 w-12 mb-3 text-gray-300" />
                  <p>No transcript available for this lecture.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {resources.length > 0 && (
            <TabsContent value="resources" className="focus:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map((resource) => (
                  <Card key={resource.id}>
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{resource.title}</h3>
                        <p className="text-sm text-gray-500">{resource.file_type}</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(resource.file_url, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
      
      <Footer />
    </div>
  );
};

export default StudentLectureView;
