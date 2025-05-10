
import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, File, Upload, FileText, FilePlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FileUpload: React.FC = () => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const allowedFileTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];

  const fileTypeToDisplay = (type: string): string => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('msword')) return 'Word';
    if (type.includes('excel') || type.includes('sheet')) return 'Excel';
    if (type.includes('text/plain')) return 'Text';
    if (type.includes('csv')) return 'CSV';
    if (type.includes('image')) return 'Image';
    return 'Document';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files ? event.target.files[0] : null;
    
    if (!file) return;
    
    // Validate file type
    if (!allowedFileTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please upload a PDF, Word, Excel, CSV, Text file, or image.');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit.');
      return;
    }
    
    setSelectedFile(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async () => {
    if (!selectedFile || !user) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      
      // Create unique file path with timestamp to avoid collisions
      const timestamp = Date.now();
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}_${timestamp}.${fileExt}`;
      const filePath = `uploads/${user.id}/${fileName}`;
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          contentType: selectedFile.type,
          upsert: false,
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Simulate progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        setUploadProgress(Math.min(progress, 90));
        if (progress >= 90) clearInterval(progressInterval);
      }, 300);
      
      // Get public URL
      const { data: publicUrlData } = await supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      // Save document entry to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          filename: selectedFile.name,
          storage_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          processing_status: 'pending'
        });
      
      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Process the document (extract text, etc.)
      const { data: processData, error: processError } = await supabase.functions.invoke(
        'process-document',
        { 
          body: { 
            filePath,
            fileName: selectedFile.name,
            fileType: selectedFile.type
          }
        }
      );
      
      if (processError) {
        toast.warning('File uploaded but processing encountered an issue. The file might have limited searchability.');
      }
      
      toast.success('Document uploaded successfully');
      
      // Reset the form
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error: any) {
      setUploadError(error.message || 'An unknown error occurred');
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.txt,.docx,.doc,.csv,.xlsx,.xls,.jpeg,.jpg,.png"
        className="hidden"
      />
      
      <div 
        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={triggerFileInput}
      >
        <div className="flex flex-col items-center">
          <Upload className="h-10 w-10 text-blue-500 mb-3" />
          <p className="text-lg font-medium mb-1">Drag & Drop or Click to Upload</p>
          <p className="text-sm text-gray-500 mb-2">
            PDF, Word, Excel, CSV, Text files, and Images up to 10MB
          </p>
          <Button 
            variant="outline" 
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
          >
            Select File
          </Button>
        </div>
      </div>
      
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      
      {selectedFile && (
        <Card className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium truncate max-w-[200px] sm:max-w-[300px]">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fileTypeToDisplay(selectedFile.type)} • {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB
                  </p>
                </div>
              </div>
              
              <Button 
                onClick={uploadFile}
                disabled={isUploading}
                className="gradient-bg"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
            
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="bg-blue-50 rounded-lg p-4 text-sm">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-700 mb-1">Why upload documents?</p>
            <p className="text-blue-600">
              When you upload your study materials, our AI can provide more personalized help by 
              referencing specific content from your documents when answering your questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
