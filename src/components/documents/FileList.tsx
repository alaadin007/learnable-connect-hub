import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileIcon, Trash2, ExternalLink, Download, 
  AlertCircle, CheckCircle2, RefreshCw 
} from 'lucide-react';
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
import { Skeleton } from "@/components/ui/skeleton";
import { getUserDocuments, getDocumentContent } from '@/utils/databaseUtils';
import { isDataResponse, isValidFileItem } from "@/utils/supabaseHelpers";

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
};

const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<DocumentContent[]>([]);
  const [activeSection, setActiveSection] = useState(1);
  const [showContent, setShowContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();

    // Subscribe to real-time updates on documents table
    const channel = supabase
      .channel('public:documents')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'documents' }, (payload) => {
        setFiles(currentFiles =>
          currentFiles.map(file =>
            file.id === payload.new.id ? { ...file, ...payload.new } : file
          )
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFiles = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      console.log("Fetching documents for user:", user.id);
      const docs = await getUserDocuments(user.id);
      
      if (docs && Array.isArray(docs)) {
        // Filter to ensure only valid FileItems are included
        const validDocs = docs.filter(isValidFileItem);
        setFiles(validDocs as FileItem[]);
      } else {
        // Fallback direct query with type safety
        const response = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id);

        if (isDataResponse(response)) {
          // Ensure we have valid FileItem objects
          const validFiles: FileItem[] = response.data
            .filter(isValidFileItem)
            .map(item => ({
              id: item.id,
              filename: item.filename,
              file_type: item.file_type,
              file_size: item.file_size,
              created_at: item.created_at,
              storage_path: item.storage_path,
              processing_status: item.processing_status
            }));
            
          setFiles(validFiles);
        } else {
          console.error('Documents query error:', 'error' in response ? response.error : 'Unknown error');
          setFiles([]);
        }
      }
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to fetch your files. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to fetch your files',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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

  const confirmDelete = (file: FileItem) => setFileToDelete(file);

  const deleteFile = async () => {
    if (!fileToDelete) return;

    try {
      const { error: storageErr } = await supabase.storage.from('user-content').remove([fileToDelete.storage_path]);
      if (storageErr) throw new Error(storageErr.message);

      const { error: contentErr } = await supabase.from('document_content').delete().eq('document_id', fileToDelete.id);
      if(contentErr) console.error('Error deleting document content:', contentErr);

      const { error: metaErr } = await supabase.from('documents').delete().eq('id', fileToDelete.id);
      if(metaErr) throw new Error(metaErr.message);

      toast({
        title: 'File Deleted',
        description: `${fileToDelete.filename} has been deleted successfully.`,
      });

      setFiles(curr => curr.filter(f => f.id !== fileToDelete.id));
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete file',
        variant: 'destructive',
      });
    } finally {
      setFileToDelete(null);
    }
  };

  const viewExtractedContent = async (file: FileItem) => {
    try {
      setSelectedFile(file);

      if (file.processing_status !== 'completed') {
        toast({
          title: 'Content Not Available',
          description: 'The document content is still being processed.',
          variant: 'default',
        });
        return;
      }

      const content = await getDocumentContent(file.id);

      if (content && content.length > 0) {
        setFileContent(content);
        setActiveSection(1);
        setShowContent(true);
      } else {
        toast({
          title: 'No Content Available',
          description: 'No extracted content found for this document.',
          variant: 'default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch document content',
        variant: 'destructive',
      });
    }
  };

  const retryProcessing = async (file: FileItem) => {
    try {
      const { error: updateErr } = await supabase.from('documents').update({ processing_status: 'pending' }).eq('id', file.id);
      if (updateErr) throw new Error(updateErr.message);

      const { error: funcErr } = await supabase.functions.invoke('process-document', { body: { document_id: file.id } });
      if (funcErr) throw new Error(funcErr.message);

      toast({
        title: 'Processing Restarted',
        description: 'Document processing has been restarted.',
      });

      setFiles(currentFiles =>
        currentFiles.map(f => (f.id === file.id ? { ...f, processing_status: 'pending' } : f))
      );
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to restart processing',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadFile = async (file: FileItem) => {
    try {
      const { data, error } = await supabase.storage.from('user-content').download(file.storage_path);
      if (error) throw error;

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
      const { data: signedURL, error } = await supabase.storage.from('user-content').createSignedUrl(file.storage_path, 60);
      if (error) throw error;

      window.open(signedURL.signedUrl, '_blank');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to open file',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Your Files</h3>
          <Button variant="outline" size="sm" disabled className="flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Loading...</span>
          </Button>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center">
                  <div className="mr-3 flex-shrink-0">
                    <Skeleton className="h-10 w-10 rounded" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Your Files</h3>
          <Button variant="outline" size="sm" onClick={fetchFiles} className="flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </Button>
        </div>

        <div className="p-6 bg-red-50 border border-red-100 rounded-md">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800">Failed to load files</h4>
              <p className="text-red-600 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchFiles} className="mt-3">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Your Files</h3>
          <Button variant="outline" size="sm" onClick={fetchFiles} className="flex items-center gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="text-center py-12 border border-dashed border-gray-300 rounded-md bg-gray-50">
          <FileIcon className="h-12 w-12 mx-auto text-gray-400" />
          <p className="text-gray-500 mt-3 mb-1">You haven't uploaded any files yet</p>
          <p className="text-gray-400 text-sm">Files you upload will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Your Files</h3>
        <Button variant="outline" size="sm" onClick={fetchFiles} className="flex items-center gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="space-y-3">
        {files.map(file => (
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
                    <div className="ml-2">{getProcessingStatusBadge(file.processing_status)}</div>
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
                  <Button variant="ghost" size="icon" onClick={() => downloadFile(file)} title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openFile(file)} title="Open">
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={open => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{fileToDelete?.filename}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={deleteFile}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extracted content dialog with tabs */}
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
              <Tabs value={activeSection.toString()} onValueChange={value => setActiveSection(parseInt(value))}>
                <TabsList className="w-full flex-wrap">
                  {fileContent.map(section => (
                    <TabsTrigger key={section.section_number} value={section.section_number.toString()} className="flex-grow">
                      Section {section.section_number}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {fileContent.map(section => (
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
