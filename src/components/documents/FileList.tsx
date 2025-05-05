
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileIcon, Trash2, ExternalLink, Download, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUserSchoolId } from '@/utils/schoolUtils';

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

interface FileListProps {
  disabled?: boolean;
  storageError?: string | null;
  isCheckingStorage?: boolean;
}

const FileList: React.FC<FileListProps> = ({ 
  disabled = false,
  storageError = null,
  isCheckingStorage = false
}) => {
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [activeSection, setActiveSection] = useState(1);
  const [showContent, setShowContent] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Use React Query for data fetching
  const {
    data: files,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      if (!user || disabled) {
        return [];
      }
      
      try {
        // Check if user-content bucket exists first
        const { data: bucketData, error: bucketError } = await supabase
          .storage
          .listBuckets();
          
        const bucketExists = bucketData?.some(bucket => bucket.name === 'user-content');
        
        if (bucketError || !bucketExists) {
          console.error('Storage bucket not available:', bucketError || 'Bucket not found');
          // Create the bucket if it doesn't exist (this would require admin privileges)
          if (!bucketExists) {
            try {
              const { error: createError } = await supabase.storage.createBucket('user-content', {
                public: false,
              });
              
              if (createError) {
                console.error('Error creating bucket:', createError);
                throw new Error('Could not create documents storage');
              }
            } catch (e) {
              console.error('Error setting up storage:', e);
              throw new Error('Storage service unavailable');
            }
          }
        }
      
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching documents:', error);
          throw new Error(error.message);
        }
        
        return data || [];
      } catch (err) {
        console.error('Error loading documents:', err);
        throw err;
      }
    },
    enabled: !!user && !disabled,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });

  // Query for file content (only executed when needed)
  const {
    data: fileContent = [],
    isLoading: contentLoading,
    refetch: refetchContent
  } = useQuery({
    queryKey: ['document-content', selectedFile?.id],
    queryFn: async () => {
      if (!selectedFile?.id || selectedFile.processing_status !== 'completed') {
        return [];
      }
      
      const { data, error } = await supabase
        .from('document_content')
        .select('*')
        .eq('document_id', selectedFile.id)
        .order('section_number', { ascending: true });
        
      if (error) {
        throw new Error(error.message);
      }
      
      return data || [];
    },
    enabled: !!selectedFile?.id && selectedFile.processing_status === 'completed',
    staleTime: 60000, // 1 minute
  });

  // Mutation for deleting a file
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!fileToDelete) return;
      
      // Delete from storage first
      try {
        const { error: storageError } = await supabase.storage
          .from('user-content')
          .remove([fileToDelete.storage_path]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // Continue anyway - we want to clean up the database entry
        }
      } catch (e) {
        console.error('Storage delete operation failed:', e);
        // Continue with database deletion regardless
      }
      
      // Delete content from document_content table
      try {
        const { error: contentError } = await supabase
          .from('document_content')
          .delete()
          .eq('document_id', fileToDelete.id);
          
        if (contentError) {
          console.error('Error deleting document content:', contentError);
          // Continue with deletion even if content deletion fails
        }
      } catch (e) {
        console.error('Content delete operation failed:', e);
      }
      
      // Delete metadata from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileToDelete.id);
      
      if (dbError) {
        throw new Error(dbError.message);
      }
      
      return fileToDelete.id;
    },
    onSuccess: (deletedId) => {
      toast.success('File Deleted', {
        description: `${fileToDelete?.filename} has been deleted successfully.`,
      });
      
      // Update cache by removing deleted item
      queryClient.setQueryData(['documents'], (oldData: FileItem[] | undefined) => 
        oldData ? oldData.filter(f => f.id !== deletedId) : []
      );
      
      setFileToDelete(null);
    },
    onError: (error) => {
      toast.error('Delete Failed', {
        description: error instanceof Error ? error.message : 'Failed to delete file',
      });
      setFileToDelete(null);
    }
  });

  // Mutation for retrying processing
  const retryProcessingMutation = useMutation({
    mutationFn: async (file: FileItem) => {
      // Update processing status back to pending
      const { error: updateError } = await supabase
        .from('documents')
        .update({ processing_status: 'pending' })
        .eq('id', file.id);
        
      if (updateError) {
        throw new Error(updateError.message);
      }
      
      // Trigger processing function
      try {
        const { error } = await supabase.functions.invoke('process-document', {
          body: { document_id: file.id }
        });
        
        if (error) {
          throw new Error(error.message);
        }
      } catch (e) {
        console.error('Error invoking process-document function:', e);
        // Update status to error if function invocation fails
        await supabase
          .from('documents')
          .update({ processing_status: 'error' })
          .eq('id', file.id);
          
        throw new Error('Failed to start document processing');
      }
      
      return file.id;
    },
    onSuccess: (fileId) => {
      toast.success('Processing Restarted', {
        description: 'Document processing has been restarted.',
      });
      
      // Update the file in cache
      queryClient.setQueryData(['documents'], (oldData: FileItem[] | undefined) => 
        oldData ? oldData.map(f => 
          f.id === fileId ? {...f, processing_status: 'pending'} : f
        ) : []
      );
    },
    onError: (error) => {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to restart processing',
      });
    }
  });

  // Set up realtime subscription
  React.useEffect(() => {
    if (!user) return;
    
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
          queryClient.setQueryData(['documents'], (oldData: FileItem[] | undefined) => 
            oldData ? oldData.map(file => 
              file.id === payload.new.id ? {...file, ...payload.new} : file
            ) : []
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

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
        console.error('Download error:', error);
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
      console.error('Download failed:', error);
      toast.error('Download Failed', {
        description: error instanceof Error ? error.message : 'Failed to download file',
      });
    }
  };

  const openFile = async (file: FileItem) => {
    try {
      const { data: signedURL, error } = await supabase.storage
        .from('user-content')
        .createSignedUrl(file.storage_path, 60); // URL expires in 60 seconds
      
      if (error) {
        console.error('Signed URL error:', error);
        throw new Error(error.message);
      }
      
      window.open(signedURL.signedUrl, '_blank');
    } catch (error) {
      console.error('Error opening file:', error);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to open file',
      });
    }
  };

  const confirmDelete = (file: FileItem) => {
    setFileToDelete(file);
  };

  const viewExtractedContent = async (file: FileItem) => {
    setSelectedFile(file);
    
    // Only fetch content if processing is complete
    if (file.processing_status === 'completed') {
      // Content will be fetched by the useQuery hook
      setShowContent(true);
    } else {
      toast.info('Content Not Available', {
        description: 'The document content is still being processed.',
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

  // Error state directly from the props or from the query
  const hasError = !!storageError || isError;
  const errorMessage = storageError || (error instanceof Error ? error.message : 'Error loading documents');
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Your Files</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || disabled || isCheckingStorage}
          className="text-xs"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Refresh
            </>
          )}
        </Button>
      </div>
      
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Skeleton className="h-10 w-10 mr-3" />
                  <div className="flex-grow">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-8 mx-1" />
                  <Skeleton className="h-8 w-8 mx-1" />
                  <Skeleton className="h-8 w-8 mx-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : hasError ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-md">
          <div className="mb-2">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
          </div>
          <p className="text-gray-500 mb-1">
            Unable to load your files.
          </p>
          <p className="text-sm text-gray-400 mb-3">
            {errorMessage || "Please try refreshing the page"}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      ) : files?.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 border border-gray-100 rounded-md">
          <div className="mb-2">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
          </div>
          <p className="text-gray-500 mb-1">
            You haven't uploaded any files yet.
          </p>
          <p className="text-sm text-gray-400">
            Files you upload will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {files?.map((file) => (
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
                        onClick={() => retryProcessingMutation.mutate(file)}
                        disabled={retryProcessingMutation.isPending}
                        title="Retry Processing"
                      >
                        <RefreshCw className={`h-4 w-4 text-amber-500 ${retryProcessingMutation.isPending ? 'animate-spin' : ''}`} />
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
                      disabled={deleteMutation.isPending}
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
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
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
          
          {contentLoading ? (
            <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded border">
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                <p className="text-gray-500">Loading content...</p>
              </div>
            </div>
          ) : fileContent.length === 0 ? (
            <div className="max-h-[60vh] overflow-y-auto p-4 bg-gray-50 rounded border">
              <div className="flex items-center justify-center py-8">
                <AlertCircle className="h-6 w-6 text-gray-400 mr-2" />
                <p className="text-gray-500">No content available</p>
              </div>
            </div>
          ) : fileContent.length > 1 ? (
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
          ) : (
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
