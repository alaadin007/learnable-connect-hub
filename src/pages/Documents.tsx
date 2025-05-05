
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from '@/components/documents/FileUpload';
import FileList from '@/components/documents/FileList';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const Documents: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  
  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/documents' } });
    }
  }, [user, navigate]);

  // Set up initial state - assume storage is available to avoid loading indicators
  const [storageStatus, setStorageStatus] = useState({
    ready: true,
    error: null as string | null
  });

  // Setup storage on page load to make sure it exists
  useEffect(() => {
    if (user) {
      console.log("Initializing document storage on page load");
      supabase.functions.invoke('setup-document-storage')
        .then(({ data, error }) => {
          if (error) {
            console.error("Failed to initialize storage:", error);
            setStorageStatus({
              ready: false,
              error: `Failed to initialize storage: ${error.message}`
            });
          } else {
            console.log("Storage initialization result:", data);
            setStorageStatus({
              ready: true,
              error: null
            });
          }
        })
        .catch(err => {
          console.error("Error initializing storage:", err);
          setStorageStatus({
            ready: false,
            error: "Failed to connect to storage service"
          });
        });
    }
  }, [user]);

  // Handle retrying storage setup
  const retryStorageSetup = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('setup-document-storage');
      
      if (error) {
        console.error("Failed to initialize storage on retry:", error);
        setStorageStatus({
          ready: false,
          error: `Failed to initialize storage: ${error.message}`
        });
        return;
      }
      
      console.log("Storage setup successful on retry:", data);
      setStorageStatus({
        ready: true,
        error: null
      });
      
      toast.success("Document storage is now ready");
    } catch (err) {
      console.error("Error retrying storage setup:", err);
      setStorageStatus({
        ready: false,
        error: "Failed to connect to storage service"
      });
    }
  };

  if (!user) {
    return null; // Redirect handled in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Documents</h1>
            <p className="text-learnable-gray">
              Upload your learning materials to help the AI provide more personalized answers. 
              Files you upload will be processed and can be referenced in your chat sessions.
            </p>
          </div>

          <Alert className="mb-6 bg-blue-50 border-blue-200" role="region" aria-label="Enhanced AI Assistance information">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-700">Enhanced AI Assistance</AlertTitle>
            <AlertDescription className="text-blue-600">
              When you chat with the AI, it can now use your uploaded documents as reference material to provide more personalized and accurate answers. 
              Switch between using and not using documents in your chat sessions anytime.
            </AlertDescription>
          </Alert>

          {storageStatus.error && (
            <Alert className="mb-6 bg-red-50 border-red-200" variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-red-700">Connection Error</AlertTitle>
              <AlertDescription className="text-red-600 flex items-center justify-between">
                <span>There was a problem with the document storage. Please try refreshing.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 border-red-200 hover:bg-red-100" 
                  onClick={retryStorageSetup}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Card className="mb-8 shadow-sm">
            <CardHeader className="pb-0">
              <CardTitle>Learning Materials</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6 w-full sm:w-auto" role="tablist">
                  <TabsTrigger value="upload" role="tab" aria-selected={activeTab === 'upload'} className="flex-1 sm:flex-initial">Upload New</TabsTrigger>
                  <TabsTrigger value="list" role="tab" aria-selected={activeTab === 'list'} className="flex-1 sm:flex-initial">My Files</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" role="tabpanel" tabIndex={0}>
                  <FileUpload 
                    onSuccess={() => setActiveTab('list')} 
                    disabled={!storageStatus.ready}
                  />
                </TabsContent>
                <TabsContent value="list" role="tabpanel" tabIndex={0}>
                  <FileList 
                    disabled={!storageStatus.ready}
                    storageError={storageStatus.error}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <section aria-labelledby="how-it-works-title" className="mb-8">
            <h2 id="how-it-works-title" className="text-xl font-semibold mb-2">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: '1. Upload', description: 'Upload your learning materials, including PDFs and images of notes or textbooks.' },
                { title: '2. Processing', description: 'Our system automatically extracts text content from your files.' },
                { title: '3. Chat', description: 'Ask questions in the chat about your documents and receive contextual responses.' },
                { title: '4. Voice Input', description: 'Use the microphone button in chat to ask questions by speaking instead of typing.' },
              ].map((item, idx) => (
                <Card key={idx} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="font-medium text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="tips-title" className="bg-white p-6 rounded-lg shadow-sm mb-8 border border-gray-100">
            <h2 id="tips-title" className="text-xl font-semibold mb-4">Tips for Better Document Usage</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Upload clear, well-scanned documents for better text extraction</li>
              <li>Use the "Using Documents" toggle in chat to control when the AI uses your materials</li>
              <li>When asking questions, be specific about which document you're referring to</li>
              <li>Click on source citations in AI responses to see which parts of your documents were referenced</li>
              <li>Upload a variety of materials on the same topic for more comprehensive answers</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Documents;
