
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileIcon, Trash2, ExternalLink, Download, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FileItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
  processing_status: string;
};

type DocumentContent = {
  id: string;
  document_id: string;
  content: string;
  section_number: number;
}

const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<DocumentContent[]>([]);
  const [activeSection, setActiveSection] = useState(1);
  const [showContent, setShowContent] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Pre-fetch files immediately when component mounts
  useEffect(() => {
    if (user) {
      fetchFiles();
      
      // Set up a real-time subscription to detect changes to documents
      const channel = supabase
        .channel('public:documents')
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'documents'
          }, 
          (payload) => {
            // Update the file in our state if it exists
            setFiles(currentFiles => 
              currentFiles.map(file => 
                file.id === payload.new.id ? {...file, ...payload.new} : file
              )
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchFiles = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setFiles(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch your files',
        variant: 'destructive',
      });
      console.error('Error fetching files:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('image')) return 'image';
    return 'document';
  };

  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadFile = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('user-content')
        .download(file.storage_path);
      
      if (error) {
        throw new Error(error.message);
      }
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const openFile = async (file: FileItem) => {
    try {
      const { data: signedURL, error } = await supabase.storage
        .from('user-content')
        .createSignedUrl(file.storage_path, 60); // URL expires in 60 seconds
      
      if (error) {
        throw new Error(error.message);
      }
      
      window.open(signedURL.signedUrl, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open file',
        variant: 'destructive',
      });
    }
  };

  const confirmDelete = (file: FileItem) => {
    setFileToDelete(file);
  };

  const deleteFile = async () => {
    if (!fileToDelete) return;
    
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('user-content')
        .remove([fileToDelete.storage_path]);
      
      if (storageError) {
        throw new Error(storageError.message);
      }
      
      // Delete content from document_content table
      const { error: contentError } = await supabase
        .from('document_content')
        .delete()
        .eq('document_id', fileToDelete.id);
        
      if (contentError) {
        console.error('Error deleting document content:', contentError);
        // Continue with deletion even if content deletion fails
      }
      
      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) {
        throw new Error(dbError.message);
      }
      
      toast({
        title: 'File Deleted',
        description: `${fileToDelete.filename} has been deleted successfully.`
      });
      
      // Refresh file list
      setFiles(files.filter(f => f.id !== fileToDelete.id));
      
    } catch (error) {
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setFileToDelete(null);
    }
  };

  const viewExtractedContent = async (file: FileItem) => {
    try {
      setSelectedFile(file);
      
      // Only fetch content if processing is complete
      if (file.processing_status === 'completed') {
        const { data, error } = await supabase
          .from('document_content')
          .select('*')
          .eq('document_id', file.id)
          .order('section_number', { ascending: true });
          
        if (error) {
          throw new Error(error.message);
        }
        
        if (data && data.length > 0) {
          setFileContent(data);
          setActiveSection(1);
          setShowContent(true);
        } else {
          toast({
            title: 'No Content Available',
            description: 'No extracted content found for this document.',
            variant: 'default',
          });
        }
      } else {
        toast({
          title: 'Content Not Available',
          description: 'The document content is still being processed.',
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch document content',
        variant: 'destructive',
      });
    }
  };

  const getProcessingStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 bg-yellow-50">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="text-blue-600 bg-blue-50">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-600 bg-green-50">Processed</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-600 bg-red-50">Error</Badge>;
      case 'unsupported':
        return <Badge variant="outline" className="text-gray-600 bg-gray-50">Unsupported</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Function to retrigger processing for failed documents
  const retryProcessing = async (file: FileItem) => {
    try {
      // Update processing status back to pending
      const { error: updateError } = await supabase
        .from('documents')
        .update({ processing_status: 'pending' })
        .eq('id', file.id);
        
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Trigger processing function
      const { error } = await supabase.functions.invoke('process-document', {
        body: { document_id: file.id }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast({
        title: 'Processing Restarted',
        description: 'Document processing has been restarted.'
      });
      
      // Update the file in state
      setFiles(currentFiles => 
        currentFiles.map(f => 
          f.id === file.id ? {...f, processing_status: 'pending'} : f
        )
      );
      
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restart processing',
        variant: 'destructive',
      });
    }
  };

  // Render the content immediately
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Your Files</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchFiles} 
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>
      
      {files.length === 0 ? (
        <p className="text-center py-8 text-gray-500">
          You haven't uploaded any files yet.
        </p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-center">
                  <div className="mr-3 flex-shrink-0">
                    <FileIcon className="h-10 w-10 text-blue-500" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center">
                      <p className="font-medium text-sm truncate flex-grow" title={file.filename}>
                        {file.filename}
                      </p>
                      <div className="ml-2">
                        {getProcessingStatusBadge(file.processing_status)}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="mx-1.5">•</span>
                      <span title={new Date(file.created_at).toLocaleString()}>
                        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    {file.processing_status === 'completed' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => viewExtractedContent(file)}
                        title="View Extracted Content"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {(file.processing_status === 'error' || file.processing_status === 'unsupported') && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => retryProcessing(file)}
                        title="Retry Processing"
                      >
                        <RefreshCw className="h-4 w-4 text-amber-500" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => downloadFile(file)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => openFile(file)}
                      title="Open"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => confirmDelete(file)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{fileToDelete?.filename}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700"
              onClick={deleteFile}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Content Dialog with pagination for multiple sections */}
      <AlertDialog open={showContent} onOpenChange={setShowContent}>
        <AlertDialogContent className="max-w-4xl">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle>Extracted Content</AlertDialogTitle>
            <AlertDialogDescription>
              Extracted text from {selectedFile?.filename}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {fileContent.length > 1 && (
            <div className="mt-2 mb-4">
              <Tabs
                value={activeSection.toString()} 
                onValueChange={(value) => setActiveSection(parseInt(value))}
              >
                <TabsList className="w-full flex-wrap">
                  {fileContent.map((section) => (
                    <TabsTrigger 
                      key={section.section_number} 
                      value={section.section_number.toString()}
                      className="flex-grow"
                    >
                      Section {section.section_number}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {fileContent.map((section) => (
                  <TabsContent 
                    key={section.section_number} 
                    value={section.section_number.toString()}
                    className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded border"
                  >
                    <pre className="whitespace-pre-wrap text-sm">{section.content}</pre>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
          
          {fileContent.length === 1 && (
            <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded border">
              <pre className="whitespace-pre-wrap text-sm">{fileContent[0]?.content}</pre>
            </div>
          )}
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileList;
