
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { hasData, deleteDocument, deleteDocumentContent } from '@/utils/supabaseTypeHelpers';

// Define document type for clarity
interface Document {
  id: string;
  filename: string;
  file_type: string;
  processing_status: string;
  created_at: string;
  file_size: number;
  storage_path: string;
}

const FileList = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [deleting, setDeleting] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        setDocuments(data as Document[]);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      // Show deleting state for this document
      setDeleting(prev => ({ ...prev, [documentId]: true }));
      
      // Delete document content first
      const contentResult = await deleteDocumentContent(documentId);
      if (contentResult.error) {
        console.warn('Warning deleting document content:', contentResult.error);
        // Continue anyway as the document content might not exist
      }
      
      // Delete document record
      const docResult = await deleteDocument(documentId);
      if (docResult.error) {
        throw docResult.error;
      }
      
      // Delete from storage
      const document = documents.find(doc => doc.id === documentId);
      if (document?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([document.storage_path]);
          
        if (storageError) {
          console.warn('Warning deleting storage file:', storageError);
          // Continue anyway as the document record is already deleted
        }
      }
      
      // Update local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleting(prev => ({ ...prev, [documentId]: false }));
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      // Get document content if it exists
      const { data: contentData, error: contentError } = await supabase
        .from('document_content')
        .select('content')
        .eq('document_id', document.id)
        .single();
      
      if (contentError && contentError.code !== 'PGRST116') { // Not found is ok
        throw contentError;
      }
      
      // Get download URL
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.storage_path, 60); // 60 seconds expiry
      
      if (error) {
        throw error;
      }
      
      if (data?.signedUrl) {
        // Download the file
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getFileIcon = (fileType: string) => {
    // You could add more specific icons based on file type
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No documents found. Upload some files to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getFileIcon(doc.file_type)}
                <div>
                  <h3 className="font-medium">{doc.filename}</h3>
                  <div className="flex space-x-4 text-xs text-gray-500">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>{formatDate(doc.created_at)}</span>
                    <span className={getStatusColor(doc.processing_status)}>
                      {doc.processing_status.charAt(0).toUpperCase() + doc.processing_status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting[doc.id]}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FileList;
