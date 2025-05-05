
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface FileUploadProps {
  onSuccess?: () => void;
  disabled?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, disabled = false }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [bucketReady, setBucketReady] = useState(true); // Default to true to avoid initial loading
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize storage bucket when component mounts
  useEffect(() => {
    const initStorage = async () => {
      if (user) {
        try {
          console.log("Initializing document storage");
          await supabase.functions.invoke('setup-document-storage');
          setBucketReady(true);
        } catch (err) {
          console.error("Failed to initialize storage:", err);
          setUploadError("Storage initialization failed. Please try again later.");
        }
      }
    };

    initStorage();
  }, [user]);

  const resetUploadState = () => {
    setFile(null);
    setUploadError(null);
    setUploadSuccess(false);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    resetUploadState();
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        setUploadError('Unsupported file format. Please upload a PDF, PNG, or JPEG file.');
        return;
      }
      
      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        setUploadError('File exceeds the maximum size limit of 50MB.');
        return;
      }
      
      setFile(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    disabled: disabled || uploading,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    noClick: true, // Disable click to prevent double opening of file dialog
    noKeyboard: true // Disable keyboard to prevent keyboard activation
  });

  const handleUpload = async () => {
    if (!file || !user) {
      return;
    }

    setUploading(true);
    setUploadError(null);
    
    try {
      console.log("Starting file upload process");
      // Generate a unique storage path to prevent file name collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      console.log(`Uploading ${file.name} to ${filePath}`);
      
      // Upload file to storage
      const { error: uploadError, data: uploadData } = await supabase
        .storage
        .from('user-content')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(uploadError.message);
      }
      
      console.log("File upload successful:", uploadData);
      
      // Store file metadata in the database
      const { error: dbError, data: docData } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: file.name,
          storage_path: filePath,
          file_type: file.type,
          file_size: file.size,
          processing_status: 'completed' // Mark as completed immediately
        })
        .select()
        .single();
        
      if (dbError) {
        console.error("Database error:", dbError);
        throw new Error(dbError.message);
      }

      console.log("Document record created:", docData);
      
      setUploadSuccess(true);
      toast.success("File uploaded successfully");
      
      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to upload file';
      console.error('Upload error:', error);
      setUploadError(errMsg);
      toast.error("Upload failed", {
        description: errMsg
      });
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input 
          {...getInputProps()} 
          ref={fileInputRef}
        />
        
        <div className="flex flex-col items-center justify-center">
          <Upload className="h-10 w-10 text-blue-500 mb-4" />
          <p className="text-lg font-medium">
            {isDragActive ? 'Drop your file here' : 'Drop your file here'}
          </p>
          <p className="text-sm text-gray-500 mt-2">or click to browse from your computer</p>
          
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={handleButtonClick}
            disabled={disabled || uploading}
          >
            Choose file
          </Button>
          
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: PDF, PNG, JPEG. Maximum size: 50MB.
          </p>
        </div>
      </div>
      
      {file && (
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-start">
            <FileText className="h-6 w-6 text-blue-500 mr-2 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {!uploading && !uploadSuccess && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-gray-500 hover:text-red-500"
                    onClick={clearSelectedFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleUpload} disabled={disabled || uploading || uploadSuccess}>
                    Upload
                  </Button>
                </>
              )}
              {uploading && (
                <Button disabled variant="outline" className="border-blue-200 text-blue-600">
                  Uploading
                </Button>
              )}
              {uploadSuccess && (
                <Button variant="outline" disabled className="border-green-400 text-green-600">
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Uploaded
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
      {uploadSuccess && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            File successfully uploaded and ready to use.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default FileUpload;
