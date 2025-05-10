import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquare, Layers, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import AIChat from '@/components/ai-tutor/AIChat';
import FlashcardCreator from '@/components/ai-tutor/FlashcardCreator';
import { DocumentSummaryType } from '@/types/database';

const StudentPDFViewer = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [document, setDocument] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('pdf');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  // Check authentication
  useEffect(() => {
    if (!user) {
      console.log("No user found, redirecting to login");
      navigate("/login");
      return;
    }
  }, [user, navigate]);

  // Fetch document data
  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!id || !user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch document details
        const { data: documentData, error: documentError } = await supabase
          .from('documents')
          .select('*')
          .eq('id', id)
          .single();
        
        if (documentError) {
          console.error('Error fetching document:', documentError);
          toast.error('Could not load document details');
          navigate('/documents');
          return;
        }
        
        if (documentData) {
          setDocument(documentData);
          console.log("Document loaded:", documentData.filename);
          
          // Get the PDF URL
          if (documentData.storage_path) {
            const { data: publicUrlData } = supabase.storage
              .from('documents')
              .getPublicUrl(documentData.storage_path);
              
            if (publicUrlData?.publicUrl) {
              setPdfUrl(publicUrlData.publicUrl);
            }
          }
          
          // Check if we have a summary
          const { data: summaryData, error: summaryError } = await supabase
            .from('document_summaries')
            .select('summary')
            .eq('document_id', id)
            .single();
            
          if (!summaryError && summaryData?.summary) {
            setSummary(summaryData.summary);
          } else {
            // If no summary exists, generate one
            generateSummary(id);
          }
        }
      } catch (err) {
        console.error('Error in fetchDocumentData:', err);
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocumentData();
  }, [id, user, navigate]);

  const generateSummary = async (documentId: string) => {
    try {
      toast.info('Generating document summary...', { duration: 3000 });
      
      const { data, error } = await supabase.functions.invoke('document-processor', {
        body: { documentId, action: 'summarize' },
      });
      
      if (error) {
        throw new Error('Failed to generate summary: ' + error.message);
      }
      
      if (data?.summary) {
        setSummary(data.summary);
        toast.success('Summary generated successfully!');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Could not generate document summary');
    }
  };

  const handleConversationCreated = (id: string) => {
    setConversationId(id);
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center mb-6">
            <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate('/documents')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documents
            </Button>
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[600px] w-full rounded-md" />
          </div>
        </div>
        <Footer />
      </>
    );
  }
  
  if (!document) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-gray-600 mb-6">The document you are looking for does not exist or you don't have permission to access it.</p>
            <Button onClick={() => navigate('/documents')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Documents
            </Button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" onClick={() => navigate('/documents')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>
        </div>

        <h1 className="text-3xl font-bold mb-4">{document.filename}</h1>
        <p className="text-gray-600 mb-6">
          Uploaded on {new Date(document.created_at).toLocaleDateString()}
        </p>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pdf">
              <FileText className="w-4 h-4 mr-2" />
              PDF Viewer
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat with AI
            </TabsTrigger>
            <TabsTrigger value="summary">
              <File className="w-4 h-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="flashcards">
              <Layers className="w-4 h-4 mr-2" />
              Flashcards
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pdf" className="outline-none">
            <Card>
              <CardContent className="p-0">
                {pdfUrl ? (
                  <div className="h-[70vh]">
                    <iframe
                      src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className="w-full h-full border-none rounded"
                      title={document.filename}
                    ></iframe>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-md">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-xl font-medium text-gray-600">Document preview not available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="chat" className="outline-none">
            <div className="h-[70vh]">
              <AIChat
                conversationId={conversationId || undefined}
                onConversationCreated={handleConversationCreated}
                contextDocumentId={id}
                initialContext={`I'm here to help you with your document: "${document.filename}". What would you like to know about it?`}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="outline-none">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Document Summary</h3>
                {summary ? (
                  <div className="prose prose-blue max-w-none">
                    {summary.split('\n').map((line, index) => (
                      <p key={index} className={line.trim().startsWith('•') ? 'ml-4' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">Generating summary...</p>
                    <div className="flex justify-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="flashcards" className="outline-none">
            <Card>
              <CardContent className="p-6">
                <FlashcardCreator documentId={id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </>
  );
};

export default StudentPDFViewer;
