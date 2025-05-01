
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FileIcon, Trash2, ExternalLink, Download } from 'lucide-react';
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

type FileItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
};

const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchFiles = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user]);

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

  return (
    <div>
      <h3 className="text-lg font-medium mb-4">Your Files</h3>
      
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : files.length === 0 ? (
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
                    <p className="font-medium text-sm truncate" title={file.filename}>
                      {file.filename}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span className="mx-1.5">•</span>
                      <span title={new Date(file.created_at).toLocaleString()}>
                        {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
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
    </div>
  );
};

export default FileList;
