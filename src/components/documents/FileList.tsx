
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, AlertCircle, RefreshCw, Check, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'error';
  storage_path: string;
}

interface FileListProps {
  disabled?: boolean;
  storageError?: string | null;
  isCheckingStorage?: boolean;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const FileList: React.FC<FileListProps> = ({ disabled, storageError, isCheckingStorage }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  
  // Fetch documents with React Query - no loading state displayed
  const { 
    data: documents = [], 
    isError,
    error, 
    refetch 
  } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw new Error(error.message);
      
      return (data || []).map(doc => {
        const validStatus: Document['processing_status'] = 
          ['pending', 'processing', 'completed', 'error'].includes(doc.processing_status) 
            ? doc.processing_status as Document['processing_status']
            : 'completed'; // Default to completed instead of pending
            
        return {
          ...doc,
          processing_status: validStatus
        } as Document;
      });
    },
    enabled: !!user && !disabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    initialData: []
  });
  
  // Delete document mutation
  const { mutate: deleteDocument, isPending: isDeleting } = useMutation({
    mutationFn: async (document: Document) => {
      if (!user) throw new Error('User not authenticated');
      
      // Delete the file from storage
      const { error: storageError } = await supabase
        .storage
        .from('user-content')
        .remove([document.storage_path]);
        
      if (storageError) throw new Error(`Storage error: ${storageError.message}`);
      
      // Delete the file metadata from the database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);
        
      if (dbError) throw new Error(`Database error: ${dbError.message}`);
      
      return document;
    },
    onSuccess: (deletedDoc) => {
      queryClient.setQueryData(['documents', user?.id], (oldData: Document[] | undefined) => {
        if (!oldData) return [];
        return oldData.filter(doc => doc.id !== deletedDoc.id);
      });
      
      toast.success("File deleted successfully");
      setDocumentToDelete(null);
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete file", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  const handleDeleteConfirm = () => {
    if (documentToDelete) {
      deleteDocument(documentToDelete);
    }
  };
  
  const confirmDelete = (document: Document) => {
    setDocumentToDelete(document);
  };
  
  const cancelDelete = () => {
    setDocumentToDelete(null);
  };

  // Display content immediately
  if (disabled) {
    return (
      <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
        <AlertCircle className="mx-auto h-8 w-8 text-amber-500 mb-2" />
        <p className="text-gray-600">Document storage is currently unavailable.</p>
        {storageError && <p className="text-sm text-red-500 mt-2">{storageError}</p>}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 border border-dashed border-red-200 rounded-lg">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-600">Failed to load your documents</p>
        <p className="text-sm text-red-500 mt-1">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
        <Button 
          variant="outline" 
          className="mt-4 border-red-200" 
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
        <FileText className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-gray-600 mb-2">No documents found</p>
        <p className="text-sm text-gray-500">
          Upload your first document to enhance AI assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-medium">Your Uploaded Documents</h3>
        <Button 
          variant="ghost" 
          className="text-blue-600"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="overflow-hidden bg-white rounded-md border divide-y">
        {documents.map((doc) => (
          <div key={doc.id} className="p-4 hover:bg-gray-50 flex items-center">
            <div className="flex-shrink-0 mr-4">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.filename}</p>
              <div className="flex items-center mt-1 text-sm text-gray-500 space-x-4">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>•</span>
                <span>{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                <span>•</span>
                <span className="flex items-center">
                  {doc.processing_status === 'completed' && (
                    <>
                      <Check className="h-3 w-3 text-green-500 mr-1" />
                      <span className="text-green-600">Ready</span>
                    </>
                  )}
                  {doc.processing_status === 'error' && (
                    <>
                      <XCircle className="h-3 w-3 text-red-500 mr-1" />
                      <span className="text-red-600">Failed</span>
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => confirmDelete(doc)}
              disabled={isDeleting}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>
      
      <AlertDialog open={!!documentToDelete} onOpenChange={cancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{documentToDelete?.filename}" and it cannot be recovered.
              This file will no longer be available for AI assistance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
            >
              {isDeleting ? 'Deleting' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileList;
