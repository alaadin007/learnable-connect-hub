
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Trash2, 
  AlertCircle, 
  Check, 
  Clock,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { getDocumentContent } from "@/utils/supabaseTypeHelpers";

interface DocumentItem {
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
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id as string)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error("Failed to load documents");
        console.error("Error fetching documents:", error);
        return;
      }
      
      // Type cast the data to ensure it matches DocumentItem[]
      if (data) {
        setDocuments(data as unknown as DocumentItem[]);
      }
    } catch (err) {
      console.error("Error in fetchDocuments:", err);
      toast.error("An error occurred while loading documents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handleViewDocument = async (documentId: string) => {
    try {
      // First get document content
      const content = await getDocumentContent(documentId as string);
        
      if (!content) {
        toast.warning("Document content not found");
        return;
      }
      
      // Find the document to get its name
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return;
      
      // Display content in a new tab 
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${document.filename}</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
                pre { white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>${document.filename}</h1>
              <pre>${content}</pre>
            </body>
          </html>
        `);
      }
      
    } catch (err) {
      console.error("Error viewing document:", err);
      toast.error("An error occurred while retrieving document content");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      // Delete content first due to foreign key constraints
      const { error: contentError } = await supabase
        .from('document_content')
        .delete()
        .eq('document_id', documentId as string);
        
      if (contentError) {
        console.error("Error deleting document content:", contentError);
      }
      
      // Then delete the document record
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId as string);
        
      if (docError) {
        throw docError;
      }
      
      // Update the UI
      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast.success("Document deleted successfully");
      
    } catch (err) {
      console.error("Error deleting document:", err);
      toast.error("Failed to delete document");
    }
  };

  if (loading) {
    return <p className="text-center py-8">Loading your documents...</p>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Your Documents</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </>
          )}
        </Button>
      </div>
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border rounded-md p-4 flex items-center justify-between"
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-500" />
                <div>
                  <h3 className="font-medium">{doc.filename}</h3>
                  <p className="text-sm text-muted-foreground">
                    Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Status:{" "}
                    {doc.processing_status === "pending" ? (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        <Clock className="mr-1.5 h-3 w-3" />
                        Processing
                      </span>
                    ) : doc.processing_status === "completed" ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        <Check className="mr-1.5 h-3 w-3" />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        <AlertCircle className="mr-1.5 h-3 w-3" />
                        Failed
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewDocument(doc.id)}
                >
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteDocument(doc.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileList;
