
import React, { useState } from 'react';
import { UploadCloud, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DocumentUploaderProps {
  onDocumentUploaded?: (documentId: string, filename: string) => void;
  allowedFileTypes?: string[];
  maxSizeMB?: number;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onDocumentUploaded,
  allowedFileTypes = ['.pdf', '.docx', '.pptx', '.txt'],
  maxSizeMB = 10
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
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

    // Check file type
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!allowedFileTypes.includes(fileExtension)) {
      setError(`File type not supported. Allowed types: ${allowedFileTypes.join(', ')}`);
      return false;
    }

    setError("");
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
    setError("");
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
        .from('documents')
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
        .from('documents')
        .getPublicUrl(filePath);

      if (!publicUrlData.publicUrl) {
        throw new Error('Error getting public URL for file');
      }

      // 3. Create a record in the documents table
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          school_id: schoolId,
          filename: file.name,
          storage_path: filePath,
          file_type: fileExtension,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (documentError) {
        throw new Error('Error creating document record: ' + documentError.message);
      }

      setUploadProgress(75);

      // 4. Call the document processor function to process the file
      const { error: processingError } = await supabase.functions.invoke('process-document', {
        body: { documentId: documentData.id, filePath },
      });

      if (processingError) {
        console.error('Warning: Document processing initiated with errors:', processingError);
        // We don't throw an error here because the document is uploaded successfully
        // and processing can happen asynchronously
      }

      setUploadProgress(100);
      
      toast.success('Document uploaded successfully!');
      
      if (onDocumentUploaded) {
        onDocumentUploaded(documentData.id, file.name);
      }
      
      // Reset the file state after a successful upload
      setTimeout(() => {
        setFile(null);
        setIsUploading(false);
      }, 1000);
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error(err instanceof Error ? err.message : 'An error occurred while uploading');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
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
                <p className="text-lg font-medium text-gray-700 mb-1">Drag & drop your document here</p>
                <p className="text-sm text-gray-500 mb-4">or click to browse files</p>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('fileInput')?.click()}
                  disabled={isUploading}
                >
                  Select File
                </Button>
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={allowedFileTypes.join(',')}
                  disabled={isUploading}
                />
                <p className="mt-4 text-xs text-gray-500">
                  Allowed file types: {allowedFileTypes.join(', ')}, Max size: {maxSizeMB}MB
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <FileText className="h-8 w-8 text-blue-500" />
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
                  Upload Document
                </Button>
              )}
            </div>
          )}
        </div>

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

export default DocumentUploader;
