
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_FILE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

const FileUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const validateFile = (file: File): { valid: boolean; message?: string } => {
    if (!file) return { valid: false, message: 'No file selected.' };
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { 
        valid: false, 
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` 
      };
    }
    
    // Check file type
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(fileExt)) {
      return { 
        valid: false, 
        message: `Invalid file type. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}` 
      };
    }
    
    return { valid: true };
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      const validation = validateFile(selectedFile);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.message,
          variant: 'destructive'
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      const validation = validateFile(selectedFile);
      
      if (!validation.valid) {
        toast({
          title: 'Invalid File',
          description: validation.message,
          variant: 'destructive'
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };
  
  // Function to trigger content processing after upload
  const triggerContentProcessing = async (documentId: string) => {
    try {
      setProcessingStatus('pending');
      
      const { error } = await supabase.functions.invoke('process-document', {
        body: { document_id: documentId }
      });
      
      if (error) {
        console.error('Error triggering document processing:', error);
        setProcessingStatus('error');
        toast({
          title: 'Processing Failed',
          description: 'Failed to process document content. Please try again.',
          variant: 'destructive'
        });
      } else {
        setProcessingStatus('processing');
      }
    } catch (err) {
      console.error('Error calling process-document function:', err);
      setProcessingStatus('error');
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    const validation = validateFile(file);
    if (!validation.valid) {
      toast({
        title: 'Invalid File',
        description: validation.message,
        variant: 'destructive'
      });
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setProcessingStatus(null);
    
    try {
      // Create a unique file path using user ID
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            if (progress.totalBytes) {
              const percent = (progress.uploadedBytes / progress.totalBytes) * 100;
              setUploadProgress(percent);
            }
          }
        });
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }
      
      // Store metadata in documents table
      const { data: metadataData, error: metadataError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          processing_status: 'pending'
        })
        .select()
        .single();
      
      if (metadataError) {
        // If metadata storage fails, attempt to delete the uploaded file
        await supabase.storage.from('user-content').remove([filePath]);
        throw new Error(metadataError.message);
      }
      
      // Trigger content processing
      await triggerContentProcessing(metadataData.id);
      
      toast({
        title: 'Upload Successful',
        description: `${file.name} has been uploaded and is being processed.`
      });
      
      setFile(null);
      // Reset file input by clearing the form
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Get status message based on processing state
  const getProcessingStatusMessage = () => {
    switch (processingStatus) {
      case 'pending':
        return 'Starting document processing...';
      case 'processing':
        return 'Extracting text from document...';
      case 'error':
        return 'Error processing document content.';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div 
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          transition-colors
        `} 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
        <Label htmlFor="file-upload" className="block mb-2 font-medium">
          {file ? file.name : 'Click or drag file to upload'}
        </Label>
        <p className="text-sm text-gray-500 mb-2">
          PDF, JPG or PNG (max. {MAX_FILE_SIZE / (1024 * 1024)}MB)
        </p>
        {file && (
          <div className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-green-600">
            <FileCheck className="h-4 w-4" />
            <span>File selected</span>
          </div>
        )}
        <Input 
          id="file-upload"
          type="file" 
          className="hidden" 
          onChange={handleFileChange} 
          accept={ALLOWED_FILE_TYPES.join(',')}
        />
      </div>

      {file && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="truncate pr-2">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="ml-2 whitespace-nowrap"
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
            
            {isUploading && (
              <div className="mt-4">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-gray-500 text-right mt-1">
                  {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
            
            {processingStatus && (
              <div className="mt-4 flex items-center text-sm">
                {processingStatus === 'processing' && (
                  <Progress className="h-2 mr-2 w-20" value={null} />
                )}
                <span className={`
                  ${processingStatus === 'error' ? 'text-red-500' : 'text-amber-600'}
                `}>
                  {getProcessingStatusMessage()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="text-sm flex items-center text-gray-500 mt-2">
        <AlertCircle className="h-4 w-4 mr-2" />
        <span>Files are private and only visible to you</span>
      </div>
    </div>
  );
};

export default FileUpload;
