import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, X, Loader } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';

interface FileUploadProps {
  onUploadComplete: () => void;
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  allowedFileTypes = ['.pdf', '.txt', '.docx', '.doc', '.md'],
  maxFileSizeMb = 10
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { profile, schoolId } = useAuth();
  
  const maxSizeBytes = maxFileSizeMb * 1024 * 1024; // Convert MB to bytes
  
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: allowedFileTypes.reduce((acc, type) => {
      // Map file extensions to MIME types
      const mimeType = getMimeType(type);
      if (mimeType) {
        if (!acc[mimeType]) acc[mimeType] = [];
        acc[mimeType].push(type);
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxSizeBytes,
    multiple: false,
    noClick: true,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some(e => e.code === 'file-too-large')) {
          toast.error(`File is too large. Maximum size is ${maxFileSizeMb}MB`);
        } else if (rejection.errors.some(e => e.code === 'file-invalid-type')) {
          toast.error(`Invalid file type. Allowed: ${allowedFileTypes.join(', ')}`);
        } else {
          toast.error('Invalid file');
        }
        return;
      }
      
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
  });
  
  // Function to get MIME type from extension
  const getMimeType = (extension: string): string => {
    const mapping: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.md': 'text/markdown',
    };
    return mapping[extension.toLowerCase()] || '';
  };
  
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };
  
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploading(false);
      setUploadProgress(0);
      toast.info('Upload canceled');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile?.id) return;
    
    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Set up abort controller for the fetch request
      abortControllerRef.current = new AbortController();
      
      // Create a unique filename in storage
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${profile.id}/${Date.now()}-${selectedFile.name}`;
      
      // Upload file to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          upsert: false,
          contentType: selectedFile.type,
          cacheControl: '3600',
        });

      if (uploadError) {
        toast.error('Upload failed: ' + uploadError.message);
        setUploading(false);
        return;
      }
      
      // Now create a record in the documents table
      // Using type assertion as any to bypass type checks for now
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          filename: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          storage_path: filePath,
          user_id: profile.id,
          school_id: schoolId || null,
          processing_status: 'pending'
        } as any)
        .select()
        .single();

      if (documentError) {
        toast.error('Failed to record document: ' + documentError.message);
        // Try to clean up the storage
        await supabase.storage.from('documents').remove([filePath]);
        setUploading(false);
        return;
      }
      
      // Start processing the document via an edge function
      if (documentData && 'id' in documentData) {
        const { error: processError } = await supabase.functions.invoke('process-document', {
          body: { document_id: documentData.id }
        });
        
        if (processError) {
          console.error('Error invoking document processing:', processError);
          toast.error('Upload successful, but document processing failed to start');
        } else {
          toast.success('Document uploaded and processing started');
        }
      }
      
      // Reset UI state
      setSelectedFile(null);
      setUploadProgress(100);
      
      // Notify parent component
      onUploadComplete();
      
      // Reset progress after a brief delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploading(false);
      }, 1000);
      
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('An unexpected error occurred during upload');
      setUploading(false);
    }
  };

  return (
    <div className="mb-6">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
        }`}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <FileText className="h-8 w-8 text-primary" />
              <div className="ml-3 text-left flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                className="ml-2"
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {uploadProgress > 0 && (
              <Progress value={uploadProgress} className="h-2" />
            )}
            
            <div className="flex justify-end space-x-2">
              {uploading ? (
                <Button variant="outline" onClick={(e) => {
                  e.stopPropagation();
                  cancelUpload();
                }}>
                  Cancel
                </Button>
              ) : (
                <Button onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }} disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            <UploadCloud className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Drag and drop your file here</p>
            <p className="text-sm text-muted-foreground mb-4">
              or click the button below to select a file
            </p>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
            >
              Select File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: {allowedFileTypes.join(', ')} (Max {maxFileSizeMb}MB)
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
