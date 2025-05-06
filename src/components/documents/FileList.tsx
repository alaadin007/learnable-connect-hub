
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, File, FileText, Image, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  isDataResponse, 
  isValidFileItem 
} from '@/utils/supabaseHelpers';

// Define the FileItem type to match the file item structure
type FileItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
  processing_status: string;
};

const FileList: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchFiles();
    }
  }, [user]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError("You must be logged in to view files");
        return;
      }

      // Fetch the user's files
      const response = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isDataResponse(response)) {
        console.error("Error fetching files:", response.error);
        setError("Failed to load your files");
        return;
      }

      // Process the data safely using the helper function
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
    } catch (error) {
      console.error("Error fetching files:", error);
      setError("An unexpected error occurred while loading your files");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string, storagePath: string) => {
    try {
      setDeletingId(fileId);
      
      // First delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-content')
        .remove([storagePath]);
      
      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue anyway to try to delete the database record
      }
      
      // Then delete the database record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileId);
      
      if (dbError) {
        throw new Error(dbError.message);
      }
      
      // Update state to remove the file
      setFiles(files.filter(file => file.id !== fileId));
      toast.success("File deleted successfully");
      
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };
  
  const formatFileSize = (sizeInBytes: number) => {
    if (sizeInBytes < 1024) return `${sizeInBytes} B`;
    if (sizeInBytes < 1024 * 1024) return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-green-500 border-green-500">Ready</Badge>;
      case 'error':
        return <Badge variant="outline" className="text-red-500 border-red-500">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-md text-red-600">
        <p className="font-medium">{error}</p>
        <Button 
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={fetchFiles}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <File className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-lg text-gray-500 mb-2">No files uploaded yet</p>
          <p className="text-sm text-gray-400">Files you upload will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Files</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={fetchFiles}
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </Button>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Type</TableHead>
              <TableHead>Filename</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>{getFileIcon(file.file_type)}</TableCell>
                <TableCell className="font-medium">{file.filename}</TableCell>
                <TableCell>{formatFileSize(file.file_size)}</TableCell>
                <TableCell>{formatDate(file.created_at)}</TableCell>
                <TableCell>{getStatusBadge(file.processing_status)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(file.id, file.storage_path)}
                    disabled={deletingId === file.id}
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default FileList;
