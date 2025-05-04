
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Documents: React.FC = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');
  const [redirecting, setRedirecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<'unknown' | 'available' | 'error'>('unknown');

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !redirecting) {
      setRedirecting(true);
      navigate('/login', { state: { from: '/documents' } });
    }
  }, [user, navigate, redirecting]);

  // Check storage status on component mount
  useEffect(() => {
    const checkStorage = async () => {
      if (user) {
        try {
          const { data, error } = await supabase.storage.getBucket('user-content');
          if (error) {
            setStorageStatus('error');
            setError('Storage service unavailable');
          } else {
            setStorageStatus('available');
            setError(null);
          }
        } catch (err) {
          setStorageStatus('error');
          setError('Failed to connect to document storage');
        }
      }
    };
    
    checkStorage();
  }, [user]);

  // Function to check storage bucket connection
  const checkStorageConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try a simple operation with Supabase storage to check connection
      const { data, error: storageError } = await supabase
        .storage
        .getBucket('user-content');
      
      if (storageError) {
        throw new Error(storageError.message);
      }
      
      // Connection is good
      toast.success('Document storage connection restored');
      setStorageStatus('available');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to document storage';
      setError(errorMessage);
      setStorageStatus('error');
      toast.error('Could not connect to document storage');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-2">
          <div className="h-12 w-12 rounded-full border-4 border-t-blue-600 border-b-gray-200 border-l-gray-200 border-r-gray-200 animate-spin"></div>
          <p className="text-lg font-medium text-gray-700">Loading your documents page...</p>
        </div>
      </div>
    );
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

          {error && (
            <Alert className="mb-6 bg-red-50 border-red-200" variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertTitle className="text-red-700">Connection Error</AlertTitle>
              <AlertDescription className="text-red-600 flex items-center justify-between">
                <span>There was a problem retrieving your files. Please try refreshing.</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-2 border-red-200 hover:bg-red-100" 
                  onClick={checkStorageConnection}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </>
                  )}
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
                  <FileUpload onSuccess={() => setActiveTab('list')} />
                </TabsContent>
                <TabsContent value="list" role="tabpanel" tabIndex={0}>
                  <FileList onError={(errorMsg) => setError(errorMsg)} />
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
