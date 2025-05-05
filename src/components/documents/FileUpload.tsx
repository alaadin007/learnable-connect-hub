
import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, AlertCircle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FileUploadProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
  onSuccess, 
  disabled = false 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
  };

  const validateFile = (file: File): boolean => {
    // Check file size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_SIZE) {
      setError(`File too large. Maximum size is 50MB.`);
      return false;
    }

    // Check file type
    const allowedTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Please upload a PDF or image (PNG/JPEG).`);
      return false;
    }

    return true;
  };

  // Use React Query mutation for file upload
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !user) {
        throw new Error("No file selected or user not logged in");
      }
      
      if (!validateFile(file)) {
        throw new Error("File validation failed");
      }

      // First ensure the storage bucket exists
      try {
        const setupResponse = await supabase.functions.invoke('setup-document-storage');
        if (!setupResponse.data?.success) {
          throw new Error("Failed to set up document storage");
        }
      } catch (err) {
        console.error("Error setting up storage:", err);
        // Continue anyway - the bucket might still exist
      }
      
      // Create a unique file path
      const timestamp = new Date().getTime();
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get file metadata for database
      const fileType = file.type;
      const fileSize = file.size;
      
      // Create document record in database
      const { data, error: dbError } = await supabase
        .from('documents')
        .insert([
          {
            user_id: user.id,
            filename: file.name,
            file_type: fileType,
            file_size: fileSize,
            storage_path: filePath,
            processing_status: 'pending'
          }
        ])
        .select()
        .single();
      
      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }
      
      // Call processing function to extract text
      try {
        const { error: processingError } = await supabase.functions.invoke('process-document', {
          body: { document_id: data.id }
        });
        
        if (processingError) {
          console.warn('Processing error:', processingError);
          // Continue anyway - processing can be retried later
        }
      } catch (err) {
        console.warn("Error invoking process function:", err);
        // Processing can be retried later, so continue
      }
      
      return data;
    },
    onMutate: () => {
      setProgress(0);
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);
      
      // Return the interval so we can clear it in onSuccess/onError
      return { progressInterval };
    },
    onSuccess: (data, _, context: any) => {
      clearInterval(context.progressInterval);
      setProgress(100);
      
      // Success message
      toast.success('File Uploaded', {
        description: 'Your file has been uploaded and is being processed.',
      });

      // Reset state
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500); // Small delay for feedback
      
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error, _, context: any) => {
      if (context?.progressInterval) {
        clearInterval(context.progressInterval);
      }
      setProgress(0);
      
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setError(errorMessage);
      
      toast.error('Upload Failed', {
        description: errorMessage,
      });
    }
  });

  const clearFile = () => {
    setFile(null);
    setError(null);
    setProgress(0);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-1">
          Upload PDF documents or images to enhance AI's ability to provide personalized answers.
        </p>
        <p className="text-xs text-gray-500">
          Supported formats: PDF, PNG, JPEG. Maximum size: 50MB.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className={`border-dashed border-2 hover:border-blue-300 transition-colors bg-gray-50 ${disabled ? 'opacity-70' : ''}`}>
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <div className="w-full">
            <div className="flex flex-col items-center justify-center space-y-4">
              {file ? (
                <div className="w-full">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border mb-4">
                    <div className="flex items-center flex-grow overflow-hidden">
                      <FileText className="h-8 w-8 text-blue-500 mr-3 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium text-sm truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={clearFile} 
                      disabled={uploadMutation.isPending || disabled}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {uploadMutation.isPending && (
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Uploading...</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      className="w-full"
                      onClick={() => uploadMutation.mutate()}
                      disabled={uploadMutation.isPending || disabled}
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload File
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={clearFile}
                      disabled={uploadMutation.isPending || disabled}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                    <Upload className="h-10 w-10 text-blue-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-medium text-lg">Drop your file here</h3>
                    <p className="text-sm text-gray-500">
                      or click to browse from your computer
                    </p>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    id="fileInput"
                    className="cursor-pointer max-w-sm"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    disabled={disabled}
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4">
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-700 text-sm">
            Files will be processed in the background. You'll be able to use them in your chat sessions once processing is complete.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default FileUpload;
