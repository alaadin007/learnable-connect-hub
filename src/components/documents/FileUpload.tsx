
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileIcon, Upload } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { asSupabaseParam, isValidSupabaseData } from '@/utils/supabaseHelpers';

type FileUploadProps = {
  onUploadComplete: () => void;
};

const FileUpload: React.FC<FileUploadProps> = ({ onUploadComplete }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast.error("You must be logged in to upload files.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    if (acceptedFiles.length === 0) {
      toast.error("No files were selected for upload.");
      setIsUploading(false);
      return;
    }

    const file = acceptedFiles[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    try {
      // Make sure to check if 'documents' bucket exists
      // If not, we use 'user-content' or create a new bucket
      const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('documents');
      let bucketName = 'documents';
      
      if (bucketError) {
        console.log("Documents bucket not found, using user-content bucket instead");
        bucketName = 'user-content';
      }

      // Upload the file
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Error uploading file:", error);
        toast.error("Failed to upload file");
        setIsUploading(false);
        return;
      }

      console.log("File uploaded successfully:", data);

      // Save document metadata to the database
      const metadataResult = await supabase
        .from('documents')
        .insert(asSupabaseParam({
          user_id: user.id,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          processing_status: 'pending'
        }))
        .select()
        .single();

      if (metadataResult.error) {
        console.error("Error saving document metadata:", metadataResult.error);
        toast.error("Error saving document information");
        setIsUploading(false);
        return;
      }

      const documentId = metadataResult.data?.id;
      
      if (documentId) {
        console.log("Document metadata saved:", metadataResult.data);
        setUploadProgress(100);
        
        // Trigger content processing immediately
        await triggerContentProcessing(documentId);
        toast.success("File uploaded successfully!");
        onUploadComplete();
      } else {
        console.error("Unexpected response format:", metadataResult);
        toast.error("Error processing document information");
      }
      
    } catch (err) {
      console.error("Error during upload:", err);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }, [user, onUploadComplete]);

  const triggerContentProcessing = async (documentId: string) => {
    try {
      console.log("Triggering content processing for document:", documentId);
      // Call the function to start processing
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { document_id: documentId },
        headers: { 'Content-Type': 'application/json' }
      });

      if (error) {
        console.error("Error invoking function:", error);
        toast.error("Failed to start document processing");
      } else {
        console.log("Function invoked successfully:", data);
        toast.success("Document processing started");
      }
    } catch (error) {
      console.error("Error triggering content processing:", error);
      toast.error("Failed to start document processing");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.oasis.opendocument.text': ['.odt'],
      'application/rtf': ['.rtf'],
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <CardContent>
      <div 
        {...getRootProps()} 
        className={`relative border-2 border-dashed rounded-md p-6 text-center ${isDragActive ? 'border-primary' : 'border-muted-foreground'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          {isUploading ? (
            <>
              <Upload className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
              <Progress value={uploadProgress} className="mt-2 w-full" />
            </>
          ) : (
            <>
              <FileIcon className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {isDragActive ? "Drop the file here..." : "Drag 'n' drop a file here, or click to select a file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                (Only PDF, Images, and Text files will be accepted)
              </p>
            </>
          )}
        </div>
      </div>
    </CardContent>
  );
};

export default FileUpload;
