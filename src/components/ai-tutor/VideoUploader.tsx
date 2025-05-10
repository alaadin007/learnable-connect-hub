import React, { useState, useEffect } from 'react';
import { UploadCloud, Video, X, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoType } from '@/types/database';

interface VideoUploaderProps {
  onVideoUploaded?: (videoId: string, type: 'youtube' | 'lecture', title: string) => void;
  maxSizeMB?: number;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoUploaded,
  maxSizeMB = 100
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'youtube'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isProcessingYoutube, setIsProcessingYoutube] = useState<boolean>(false);
  const { user, schoolId } = useAuth();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSizeBytes) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }

    // Check if it's a video file
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validVideoTypes.includes(file.type)) {
      setError('File type not supported. Please upload MP4, WebM, or OGG video files.');
      return false;
    }

    setError('');
    return true;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError('');
  };

  const extractYoutubeId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const validateYoutubeUrl = (url: string): boolean => {
    const youtubeId = extractYoutubeId(url);
    if (!youtubeId) {
      setError('Invalid YouTube URL. Please enter a valid YouTube video link.');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleYoutubeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    if (e.target.value) {
      validateYoutubeUrl(e.target.value);
    } else {
      setError('');
    }
  };

  const handleYoutubeSubmit = async () => {
    if (!validateYoutubeUrl(youtubeUrl) || !user) return;
    
    setIsProcessingYoutube(true);
    
    try {
      const youtubeId = extractYoutubeId(youtubeUrl);
      
      // 1. Fetch basic information about the YouTube video (normally you'd use the YouTube API)
      // For demo purposes, we'll just use the ID and a placeholder title
      const videoTitle = `YouTube Video (${youtubeId})`;
      
      // 2. Create a record in the videos table
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          title: videoTitle,
          video_type: 'youtube' as const,
          youtube_id: youtubeId,
          video_url: `https://www.youtube.com/watch?v=${youtubeId}`,
          processing_status: 'pending'
        })
        .select()
        .single();
      
      if (videoError) {
        throw new Error('Error creating video record: ' + videoError.message);
      }
      
      // 3. Call the function to process the YouTube video (fetch transcript, etc.)
      const { error: processingError } = await supabase.functions.invoke('process-youtube', {
        body: { videoId: videoData.id, youtubeId },
      });
      
      if (processingError) {
        console.error('Warning: YouTube processing initiated with errors:', processingError);
        // We don't throw an error here because the record is created successfully
        // and processing can happen asynchronously
      }
      
      toast.success('YouTube video added successfully!');
      
      if (onVideoUploaded) {
        onVideoUploaded(videoData.id, 'youtube', videoTitle);
      }
      
      // Reset the state
      setYoutubeUrl('');
    } catch (err) {
      console.error('Error processing YouTube video:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while processing the YouTube video');
    } finally {
      setIsProcessingYoutube(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Upload file to Supabase Storage
      const timestamp = new Date().getTime();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (storageError) {
        throw new Error('Error uploading file: ' + storageError.message);
      }

      setUploadProgress(50);

      // 2. Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) {
        throw new Error('Error getting public URL for file');
      }

      // 3. Create a record in the videos table
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove file extension for title
          video_type: 'lecture' as const,
          video_url: publicUrlData.publicUrl,
          storage_path: filePath,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (videoError) {
        throw new Error('Error creating video record: ' + videoError.message);
      }

      setUploadProgress(75);

      // 4. Call the video processor function to process the file
      const { error: processingError } = await supabase.functions.invoke('process-video', {
        body: { videoId: videoData.id, filePath },
      });

      if (processingError) {
        console.error('Warning: Video processing initiated with errors:', processingError);
        // We don't throw an error here because the video is uploaded successfully
        // and processing can happen asynchronously
      }

      setUploadProgress(100);
      
      toast.success('Video uploaded successfully!');
      
      if (onVideoUploaded) {
        onVideoUploaded(videoData.id, 'lecture', file.name);
      }
      
      // Reset the file state after a successful upload
      setTimeout(() => {
        setFile(null);
        setIsUploading(false);
      }, 1000);
    } catch (err) {
      console.error('Error uploading video:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while uploading');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'youtube')} className="mb-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Video</TabsTrigger>
            <TabsTrigger value="youtube">YouTube Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="pt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              } ${file ? 'bg-gray-50' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {!file ? (
                <>
                  <div className="flex flex-col items-center justify-center">
                    <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-1">Drag & drop your video here</p>
                    <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
                    <Button 
                      variant="outline"
                      onClick={() => document.getElementById('videoInput')?.click()}
                      disabled={isUploading}
                    >
                      Select Video
                    </Button>
                    <input
                      id="videoInput"
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      accept="video/*"
                      disabled={isUploading}
                    />
                    <p className="mt-4 text-xs text-gray-500">
                      Supported formats: MP4, WebM, OGG, Max size: {maxSizeMB}MB
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Video className="h-8 w-8 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / (1024 * 1024)).toFixed(2)}MB
                      </p>
                    </div>
                    {!isUploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {isUploading ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      Upload Video
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="youtube" className="pt-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="youtubeUrl" className="block mb-2 text-sm font-medium text-gray-700">
                  YouTube Video URL
                </label>
                <div className="flex gap-2">
                  <Input
                    id="youtubeUrl"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={handleYoutubeChange}
                    disabled={isProcessingYoutube}
                  />
                  <Button 
                    onClick={handleYoutubeSubmit} 
                    disabled={!youtubeUrl || isProcessingYoutube || !!error}
                  >
                    {isProcessingYoutube ? 'Processing...' : 'Add'}
                  </Button>
                </div>
              </div>
              
              {youtubeUrl && !error && extractYoutubeId(youtubeUrl) && (
                <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <img 
                        src={`https://img.youtube.com/vi/${extractYoutubeId(youtubeUrl)}/default.jpg`} 
                        alt="YouTube Thumbnail" 
                        className="w-16 h-12 object-cover rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        YouTube Video
                      </p>
                      <a 
                        href={youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 flex items-center hover:underline"
                      >
                        View on YouTube
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-3 p-3 border border-red-200 bg-red-50 rounded-md text-red-600 text-sm flex items-start">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoUploader;
