
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, TextQuote, Video, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Lecture, LectureResource, LectureProgress, LectureNote, Transcript } from '@/utils/supabaseHelpers';
import { Progress } from '@/components/ui/progress';

const StudentLectureView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [resources, setResources] = useState<LectureResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [currentTranscriptIndex, setCurrentTranscriptIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressUpdateInterval = useRef<number | null>(null);

  useEffect(() => {
    const fetchLectureData = async () => {
      if (!id || !user) {
        setError("Missing lecture ID or user is not authenticated");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Fetch lecture details
        const { data: lectureData, error: lectureError } = await supabase
          .from('lectures')
          .select('*')
          .eq('id', id)
          .single();

        if (lectureError) {
          console.error('Error fetching lecture:', lectureError);
          setError("Couldn't find the requested lecture. It may have been deleted or you don't have access.");
          setIsLoading(false);
          return;
        }
        
        if (!lectureData) {
          setError("Lecture not found");
          setIsLoading(false);
          return;
        }
        
        setLecture(lectureData as Lecture);

        // Fetch lecture resources
        const { data: resourcesData, error: resourcesError } = await supabase
          .from('lecture_resources')
          .select('*')
          .eq('lecture_id', id);

        if (!resourcesError) {
          setResources(resourcesData as LectureResource[]);
        }

        // Fetch student's progress
        const { data: progressData, error: progressError } = await supabase
          .from('lecture_progress')
          .select('*')
          .eq('lecture_id', id)
          .eq('student_id', user.id)
          .maybeSingle();

        if (!progressError && progressData) {
          setProgress(progressData.progress || 0);
        }

        // Fetch student's notes
        const { data: notesData, error: notesError } = await supabase
          .from('lecture_notes')
          .select('*')
          .eq('lecture_id', id)
          .eq('student_id', user.id)
          .maybeSingle();

        if (!notesError && notesData) {
          setNotes(notesData.notes || '');
          setNoteId(notesData.id || null);
        }

        // Fetch transcript data
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('lecture_transcripts')
          .select('*')
          .eq('lecture_id', id)
          .order('start_time', { ascending: true });

        if (!transcriptError && transcriptData) {
          setTranscript(transcriptData);
        }
      } catch (err: any) {
        console.error('Error fetching lecture data:', err);
        setError('Failed to load lecture data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLectureData();

    // Cleanup interval on unmount
    return () => {
      if (progressUpdateInterval.current) {
        window.clearInterval(progressUpdateInterval.current);
      }
    };
  }, [id, user]);

  // Update active transcript segment based on current video time
  const handleTimeUpdate = () => {
    if (!videoRef.current || transcript.length === 0) return;
    
    const currentTime = videoRef.current.currentTime;
    const video = videoRef.current;
    
    // Find the current transcript segment
    const newIndex = transcript.findIndex(segment => 
      currentTime >= segment.start_time && currentTime <= segment.end_time
    );
    
    if (newIndex !== currentTranscriptIndex) {
      setCurrentTranscriptIndex(newIndex);
    }
    
    // Update progress
    const currentProgress = Math.floor((video.currentTime / video.duration) * 100);
    
    // Only update if progress has increased
    if (currentProgress > progress) {
      setProgress(currentProgress);
      
      // Save progress to database periodically
      if (!progressUpdateInterval.current) {
        progressUpdateInterval.current = window.setInterval(() => {
          saveProgress(currentProgress);
        }, 10000); // Save every 10 seconds
      }
    }
  };

  const saveProgress = async (currentProgress: number) => {
    if (!id || !user) return;
    
    try {
      const isCompleted = currentProgress >= 95; // Consider completed when 95% watched
      
      const { error } = await supabase
        .from('lecture_progress')
        .upsert({
          lecture_id: id,
          student_id: user.id,
          progress: currentProgress,
          last_watched: new Date().toISOString(),
          completed: isCompleted
        }, { onConflict: 'lecture_id,student_id' });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving progress:', error);
      // Don't show toast for background saves to avoid spam
    }
  };

  const handleSaveNotes = async () => {
    if (!id || !user) return;
    
    try {
      setIsNoteSaving(true);
      
      const { error } = await supabase
        .from('lecture_notes')
        .upsert({
          id: noteId || undefined,
          lecture_id: id,
          student_id: user.id,
          notes: notes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'lecture_id,student_id' });
      
      if (error) throw error;
      
      toast.success('Notes saved successfully');
      
      // If this was a new note, get the ID
      if (!noteId) {
        const { data } = await supabase
          .from('lecture_notes')
          .select('id')
          .eq('lecture_id', id)
          .eq('student_id', user.id)
          .single();
          
        if (data) {
          setNoteId(data.id);
        }
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setIsNoteSaving(false);
    }
  };
  
  // Jump to specific part of video from transcript
  const jumpToTimestamp = (startTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play().catch(err => console.error("Playback error:", err));
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="h-8 w-64 bg-gray-300 rounded mb-4 mx-auto"></div>
            <div className="h-4 w-32 bg-gray-300 rounded mx-auto"></div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error || !lecture) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto px-4 py-8 min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">{error || "Lecture Not Found"}</h2>
            <Button onClick={() => navigate('/student/lectures')}>
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
      <main className="container mx-auto px-4 py-8 min-h-screen">
        <div className="mb-6">
          <Button 
            variant="outline"
            size="sm"
            className="mb-4 flex items-center"
            onClick={() => navigate('/student/lectures')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lectures
          </Button>
          
          <h1 className="text-3xl font-bold mb-2">{lecture.title}</h1>
          <p className="text-gray-600 mb-2">
            Subject: {lecture.subject}
          </p>
          
          <div className="flex items-center mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${progress}%` }}
              >
              </div>
            </div>
            <span className="ml-2 text-sm text-gray-600">
              {progress}% completed
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg overflow-hidden mb-6">
              {lecture.video_url ? (
                <video
                  ref={videoRef}
                  className="w-full aspect-video"
                  controls
                  src={lecture.video_url}
                  poster={lecture.thumbnail_url || undefined}
                  onTimeUpdate={handleTimeUpdate}
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <Video className="h-12 w-12 mx-auto mb-2" />
                    <p>Video not available</p>
                  </div>
                </div>
              )}
            </div>
            
            <Tabs defaultValue="transcript" className="mb-8">
              <TabsList className="mb-4">
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="prose max-w-none">
                <h2 className="text-2xl font-semibold mb-4">Description</h2>
                <p>{lecture.description || 'No description available.'}</p>
              </TabsContent>
              
              <TabsContent value="transcript">
                <div className="bg-gray-50 border rounded-md p-4 mb-4">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <TextQuote className="mr-2 h-5 w-5" /> Transcript
                  </h2>
                  
                  {transcript.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {transcript.map((segment, index) => (
                        <div 
                          key={segment.id || index}
                          className={`p-3 rounded-md cursor-pointer transition-colors ${currentTranscriptIndex === index ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'}`}
                          onClick={() => jumpToTimestamp(segment.start_time)}
                        >
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-medium text-blue-600">
                              {formatTimestamp(segment.start_time)} - {formatTimestamp(segment.end_time)}
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                jumpToTimestamp(segment.start_time);
                              }}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No transcript available for this lecture.</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Resources</h3>
                {resources.length > 0 ? (
                  <div className="space-y-3">
                    {resources.map((resource) => (
                      <div 
                        key={resource.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 mr-2 text-blue-600" />
                          <div>
                            <p className="font-medium">{resource.title}</p>
                            <p className="text-xs text-gray-500">{resource.file_type}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(resource.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No resources available for this lecture.</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">My Notes</h3>
                  <Button 
                    size="sm" 
                    onClick={handleSaveNotes}
                    disabled={isNoteSaving}
                  >
                    {isNoteSaving ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
                <Textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take notes about this lecture here..."
                  className="min-h-[200px]"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

// Helper function to format seconds as MM:SS
const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default StudentLectureView;
