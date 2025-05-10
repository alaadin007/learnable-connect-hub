import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  File, Trash2, AlertCircle, Search, RefreshCcw, CheckCircle, 
  XCircle, Clock, Loader2, Download, FileType 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  processing_status: string;
  created_at: string;
  storage_path: string;
  file_size: number;
}

const FileList: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshDocuments = async () => {
    setRefreshing(true);
    await fetchDocuments();
    setRefreshing(false);
  };

  const confirmDelete = (document: DocumentItem) => {
    setDocumentToDelete(document);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([documentToDelete.storage_path]);
      
      if (storageError) throw storageError;
      
      // Delete document content if exists
      await supabase
        .from('document_content')
        .delete()
        .eq('document_id', documentToDelete.id);
      
      // Delete document record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete.id);
      
      if (dbError) throw dbError;
      
      // Update local state
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
      toast.success('Document deleted successfully');
      
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const downloadDocument = async (doc: DocumentItem) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);
      
      if (error) throw error;
      
      // Create download link - Fixed: Using window.document instead of document
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileType className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('msword')) return <FileType className="text-blue-500" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FileType className="text-green-500" />;
    if (fileType.includes('csv')) return <FileType className="text-yellow-500" />;
    if (fileType.includes('image')) return <FileType className="text-purple-500" />;
    return <File className="text-gray-500" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="false" aria-label="Processing complete" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" aria-hidden="false" aria-label="Processing failed" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" aria-hidden="false" aria-label="Processing" />;
      default:
        return <Clock className="h-4 w-4 text-orange-500" aria-hidden="false" aria-label="Pending processing" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Filter documents based on search query and filter
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || doc.processing_status === filter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex space-x-2">
          <Tabs value={filter} onValueChange={setFilter} className="w-auto">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="completed">Processed</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshDocuments} 
            disabled={refreshing}
            aria-label="Refresh"
          >
            <RefreshCcw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-gray-50">
          <File className="h-10 w-10 text-gray-400 mb-2 mx-auto" />
          <p className="text-gray-500">No documents uploaded yet</p>
          <Button 
            variant="outline"
            className="mt-4"
            onClick={() => {}}
          >
            Upload Your First Document
          </Button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-gray-50">
          <AlertCircle className="h-10 w-10 text-gray-400 mb-2 mx-auto" />
          <p className="text-gray-500">No documents match your search</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          {getFileIcon(doc.file_type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={doc.filename}>
                            {doc.filename}
                          </div>
                          <div className="text-xs text-gray-500">{doc.file_type.split('/')[1]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(doc.processing_status)}
                        <span className="ml-1.5 text-xs">
                          {doc.processing_status.charAt(0).toUpperCase() + doc.processing_status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadDocument(doc)}
                          aria-label="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(doc)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{documentToDelete?.filename}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FileList;
