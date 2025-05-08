import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download, FileText, ChevronDown, ChevronUp, Eye, Loader } from 'lucide-react';
import { supabase, asDbId } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { FileItem, DocumentContent, hasRequiredFields } from '@/utils/supabaseTypeHelpers';

interface FileListProps {
  refreshTrigger?: boolean;
}

const FileList: React.FC<FileListProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, DocumentContent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const { profile, schoolId } = useAuth();

  // Fetch files when component mounts or refreshTrigger changes
  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger, profile]);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase.from('documents').select('*');
      
      if (profile?.user_type === 'teacher' || profile?.user_type === 'student') {
        // Teachers and students see only their own documents
        if (profile?.id) {
          query = query.eq('user_id', profile.id);
        }
      } else if (profile?.user_type === 'school' && schoolId) {
        // School admins see all documents from their school
        query = query.eq('school_id', schoolId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to load documents");
        return;
      }
      
      if (!data) {
        setFiles([]);
        return;
      }

      // Convert data to FileItem array, ensuring all required properties exist
      const parsedFiles: FileItem[] = data.filter(item => 
        hasRequiredFields<FileItem>(item, [
          'id', 'filename', 'file_type', 'file_size', 'storage_path', 
          'processing_status', 'user_id', 'created_at'
        ])
      ).map(item => ({
        id: item.id,
        filename: item.filename,
        file_type: item.file_type,
        file_size: item.file_size,
        storage_path: item.storage_path,
        processing_status: item.processing_status,
        user_id: item.user_id,
        created_at: item.created_at,
        school_id: item.school_id
      }));
      
      setFiles(parsedFiles);
      
      // Check which files are still processing
      const stillProcessing = parsedFiles
        .filter(file => file.processing_status === 'processing')
        .map(file => file.id);
        
      setProcessingFiles(new Set(stillProcessing));
      
      if (stillProcessing.length > 0) {
        // Poll for processing updates
        stillProcessing.forEach(fileId => {
          pollProcessingStatus(fileId);
        });
      }
    } catch (err) {
      console.error("Error in fetchFiles:", err);
      toast.error("An error occurred while loading files");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpandFile = async (fileId: string) => {
    try {
      if (expandedFile === fileId) {
        setExpandedFile(null);
        return;
      }
      
      setExpandedFile(fileId);
      
      // Check if we already have the contents
      if (fileContents[fileId]?.length > 0) return;
      
      // Fetch file content if not already loaded
      const { data, error } = await supabase
        .from('document_content')
        .select('*')
        .eq('document_id', asDbId(fileId))
        .order('section_number');
        
      if (error) {
        console.error("Error fetching document content:", error);
        toast.error("Failed to load document content");
        return;
      }
      
      if (!data) {
        setFileContents(prev => ({ ...prev, [fileId]: [] }));
        return;
      }

      // Filter and map to ensure all required fields exist
      const parsedContents: DocumentContent[] = data
        .filter(item => hasRequiredFields<DocumentContent>(item, [
          'id', 'document_id', 'section_number', 'processing_status', 
          'created_at', 'updated_at'
        ]))
        .map(item => ({
          id: item.id,
          document_id: item.document_id,
          content: item.content || '',
          section_number: item.section_number,
          processing_status: item.processing_status,
          created_at: item.created_at,
          updated_at: item.updated_at
        }));
      
      setFileContents(prev => ({ ...prev, [fileId]: parsedContents }));
    } catch (err) {
      console.error("Error in toggleExpandFile:", err);
      toast.error("An error occurred while loading file content");
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      // First, delete the document content
      const { error: contentError } = await supabase
        .from('document_content')
        .delete()
        .eq('document_id', asDbId(fileId));
        
      if (contentError) {
        console.error("Error deleting document content:", contentError);
        toast.error("Failed to delete document content");
        return;
      }
      
      // Then delete the document record
      const { error: documentError } = await supabase
        .from('documents')
        .delete()
        .eq('id', asDbId(fileId));
        
      if (documentError) {
        console.error("Error deleting document:", documentError);
        toast.error("Failed to delete document");
        return;
      }
      
      // Update the UI
      setFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success("Document deleted successfully");
      
      // Clear the content cache for this file
      const newFileContents = { ...fileContents };
      delete newFileContents[fileId];
      setFileContents(newFileContents);
      
      if (expandedFile === fileId) {
        setExpandedFile(null);
      }
    } catch (err) {
      console.error("Error in handleDelete:", err);
      toast.error("An error occurred while deleting the document");
    }
  };

  const handleDownload = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.storage_path);
        
      if (error) {
        console.error("Error downloading file:", error);
        toast.error("Failed to download file");
        return;
      }
      
      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error in handleDownload:", err);
      toast.error("An error occurred while downloading the file");
    }
  };

  const pollProcessingStatus = async (fileId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('processing_status')
        .eq('id', asDbId(fileId))
        .single();
        
      if (error) {
        console.error("Error polling document status:", error);
        return;
      }
      
      if (data && data.processing_status === 'completed') {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        
        // Update the file in our list
        setFiles(prev => 
          prev.map(file => 
            file.id === fileId 
              ? { ...file, processing_status: 'completed' } 
              : file
          )
        );
        
        toast.success(`Document "${files.find(f => f.id === fileId)?.filename}" is ready to view`);
      } else if (data && data.processing_status === 'failed') {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        
        // Update the file in our list
        setFiles(prev => 
          prev.map(file => 
            file.id === fileId 
              ? { ...file, processing_status: 'failed' } 
              : file
          )
        );
        
        toast.error(`Processing failed for "${files.find(f => f.id === fileId)?.filename}"`);
      } else {
        // Still processing, poll again in a few seconds
        setTimeout(() => pollProcessingStatus(fileId), 5000);
      }
    } catch (err) {
      console.error("Error in pollProcessingStatus:", err);
    }
  };

  const retryProcessing = async (fileId: string) => {
    try {
      // Update the document status to "processing"
      const { error } = await supabase
        .from('documents')
        .update({ processing_status: 'processing' } as any)
        .eq('id', asDbId(fileId));
        
      if (error) {
        console.error("Error updating document status:", error);
        toast.error("Failed to retry processing");
        return;
      }
      
      // Update UI
      setProcessingFiles(prev => new Set([...prev, fileId]));
      
      setFiles(prev => 
        prev.map(file => 
          file.id === fileId 
            ? { ...file, processing_status: 'processing' } 
            : file
        )
      );
      
      toast.success("Reprocessing document...");
      
      // Start polling for status updates
      pollProcessingStatus(fileId);
      
      // Trigger reprocessing via edge function
      const { error: funcError } = await supabase.functions.invoke('process-document', {
        body: { document_id: fileId }
      });
      
      if (funcError) {
        console.error("Error invoking process-document function:", funcError);
        toast.error("Failed to start document processing");
      }
    } catch (err) {
      console.error("Error in retryProcessing:", err);
      toast.error("An error occurred while retrying document processing");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'text-amber-500';
      case 'processing':
        return 'text-blue-500';
      case 'completed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Loading files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/50">
        <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
        <h3 className="mt-2 text-lg font-medium">No files uploaded yet</h3>
        <p className="text-sm text-muted-foreground">Upload a file to see it listed here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {files.map(file => (
        <Card key={file.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 flex justify-between items-center">
              <div className="flex-1">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-primary" />
                  <div>
                    <h3 className="font-medium">{file.filename}</h3>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                      <span>{file.file_type}</span>
                      <span className="px-1">•</span>
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="px-1">•</span>
                      <span className={getStatusColor(file.processing_status)}>
                        {file.processing_status.charAt(0).toUpperCase() + file.processing_status.slice(1)}
                        {processingFiles.has(file.id) && (
                          <span className="ml-2 inline-block">
                            <Loader className="w-3 h-3 animate-spin inline" />
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {file.processing_status === 'failed' && (
                  <Button variant="outline" size="sm" onClick={() => retryProcessing(file.id)}>
                    Retry
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                  <Download className="w-4 h-4" />
                </Button>
                
                {file.processing_status === 'completed' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => toggleExpandFile(file.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    {expandedFile === file.id ? (
                      <>Hide <ChevronUp className="w-3 h-3 ml-1" /></>
                    ) : (
                      <>View <ChevronDown className="w-3 h-3 ml-1" /></>
                    )}
                  </Button>
                )}
                
                <Button variant="destructive" size="sm" onClick={() => handleDelete(file.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {expandedFile === file.id && (
              <div className="border-t p-4 bg-muted/20">
                {fileContents[file.id]?.length > 0 ? (
                  fileContents[file.id].map((content, i) => (
                    <div key={content.id} className="mb-4 last:mb-0">
                      {fileContents[file.id].length > 1 && (
                        <h4 className="font-medium mb-2">Section {i + 1}</h4>
                      )}
                      <div className="whitespace-pre-wrap bg-muted/30 p-3 rounded text-sm">
                        {content.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No content available for this document.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FileList;
