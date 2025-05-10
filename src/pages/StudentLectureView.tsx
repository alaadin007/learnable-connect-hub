import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, TextQuote, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lecture, LectureResource, Transcript } from '@/utils/supabaseHelpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

const StudentLectureView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [resources, setResources] = useState<LectureResource[]>([]);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTab, setCurrentTab] = useState<string>("video");
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Check authentication
  useEffect(() => {
    if (!user) {
      console.log("No user found, redirecting to login");
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  // Function to handle time updates
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;
    
    // Update progress
    if (duration > 0) {
      setProgress((currentTime / duration) * 100);
    }
    
    // Update active transcript
    const currentTranscript = transcript.find(
      item => currentTime >= item.start_time && currentTime <= item.end_time
    );
    
    if (currentTranscript && currentTranscript.id !== activeTranscriptId) {
      setActiveTranscriptId(currentTranscript.id);
      
      // Scroll the transcript into view if we're in transcript tab
      if (currentTab === "transcript") {
        const element = document.getElementById(`transcript-${currentTranscript.id}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Function to seek to transcript point
  const seekToTranscript = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(err => console.error("Error playing video:", err));
    }
  };
  
  // Function to handle tab changes
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    
    // If switching to transcript and we have an active transcript, scroll to it
    if (value === "transcript" && activeTranscriptId) {
      setTimeout(() => {
        const element = document.getElementById(`transcript-${activeTranscriptId}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  };

  // Fetch lecture data
  useEffect(() => {
    const fetchLectureData = async () => {
      if (!id || !user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch lecture details
        const { data: lectureData, error: lectureError } = await supabase
          .from('lectures')
          .select('*')
          .eq('id', id)
          .single();
        
        if (lectureError) {
          console.error('Error fetching lecture:', lectureError);
          toast.error('Could not load lecture details');
          navigate('/student/lectures');
          return;
        }
        
        if (lectureData) {
          setLecture(lectureData);
          console.log("Lecture loaded:", lectureData.title);
        }
        
        // Fetch resources
        const { data: resourceData, error: resourceError } = await supabase
          .from('lecture_resources')
          .select('*')
          .eq('lecture_id', id);
        
        if (resourceError) {
          console.error('Error fetching resources:', resourceError);
          toast.error('Could not load lecture resources');
        } else if (resourceData) {
          setResources(resourceData);
          console.log("Resources loaded:", resourceData.length);
        }

        // Fetch transcripts - using raw query with explicit typing
        const { data: rawTranscriptData, error: transcriptError } = await supabase
          .from('lecture_transcripts')
          .select('id, lecture_id, text, start_time, end_time, created_at')
          .eq('lecture_id', id)
          .order('start_time');

        if (transcriptError) {
          console.error('Error fetching transcripts:', transcriptError);
        } else if (rawTranscriptData) {
          // Cast the data to the correct type to satisfy TypeScript
          const typedTranscriptData = rawTranscriptData.map(item => ({
            id: item.id,
            lecture_id: item.lecture_id,
            text: item.text,
            start_time: item.start_time as number,
            end_time: item.end_time as number,
            created_at: item.created_at
          }));
          
          setTranscript(typedTranscriptData);
          console.log("Transcripts loaded:", typedTranscriptData.length);
        }
      } catch (err) {
        console.error('Error in fetchLectureData:', err);
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLectureData();
  }, [id, user, navigate]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate('/student/lectures')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lectures
            </Button>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        </div>
        <Footer />
      </>
    );
  }
  
  if (!lecture) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Lecture Not Found</h2>
            <p className="text-gray-600 mb-6">The lecture you are looking for does not exist or you don't have permission to access it.</p>
            <Button onClick={() => navigate('/student/lectures')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Lectures
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate('/student/lectures')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lectures
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-4">{lecture.title}</h1>
        <p className="text-gray-600 mb-6">{lecture.description}</p>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="video">
              <Video className="w-4 h-4 mr-2" />
              Video
            </TabsTrigger>
            <TabsTrigger value="resources">
              <FileText className="w-4 h-4 mr-2" />
              Resources
            </TabsTrigger>
            {transcript.length > 0 && (
              <TabsTrigger value="transcript">
                <TextQuote className="w-4 h-4 mr-2" />
                Transcript
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="video" className="outline-none">
            <Card className="mb-4">
              <CardContent className="p-0">
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={lecture.video_url}
                    controls
                    className="w-full rounded-md aspect-video"
                    onTimeUpdate={handleTimeUpdate}
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <Progress value={progress} className="h-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resources" className="outline-none">
            <Card>
              <CardContent>
                {resources.length > 0 ? (
                  <ul className="list-none space-y-4">
                    {resources.map(resource => (
                      <li key={resource.id} className="border rounded-md p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{resource.title}</h3>
                          <p className="text-sm text-gray-500">Type: {resource.file_type}</p>
                        </div>
                        <Button variant="secondary" asChild>
                          <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            Download
                            <Download className="w-4 h-4 ml-2" />
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <h4 className="text-lg font-medium mb-2">No Resources Available</h4>
                    <p className="text-gray-500">Resources for this lecture will be added soon.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcript" className="outline-none">
            <Card>
              <CardContent>
                {transcript.length > 0 ? (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {transcript.map(item => (
                      <div
                        key={item.id}
                        id={`transcript-${item.id}`}
                        className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 ${activeTranscriptId === item.id ? 'bg-learnable-blue/10' : ''}`}
                        onClick={() => seekToTranscript(item.start_time)}
                      >
                        <p className="text-sm text-gray-700">{item.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <h4 className="text-lg font-medium mb-2">Transcript Not Available</h4>
                    <p className="text-gray-500">The transcript for this lecture is not yet available.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </>
  );
};

export default StudentLectureView;
