
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from '@/components/documents/FileUpload';
import FileList from '@/components/documents/FileList';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Documents: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upload');

  // Redirect if not logged in
  React.useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/documents' } });
    }
  }, [user, navigate]);

  // If user is not logged in, show a loading message
  if (!user) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
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
          
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-blue-700">Enhanced AI Assistance</AlertTitle>
            <AlertDescription className="text-blue-600">
              When you chat with the AI, it can now use your uploaded documents as reference material to provide more personalized and accurate answers. 
              Switch between using and not using documents in your chat sessions anytime.
            </AlertDescription>
          </Alert>
          
          <Card className="mb-8">
            <CardHeader className="pb-0">
              <CardTitle>Learning Materials</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="upload">Upload New</TabsTrigger>
                  <TabsTrigger value="list">My Files</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                  <FileUpload />
                </TabsContent>
                <TabsContent value="list">
                  <FileList />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-2">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-2">1. Upload</h3>
                  <p className="text-sm text-gray-600">
                    Upload your learning materials, including PDFs and images of notes or textbooks.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-2">2. Processing</h3>
                  <p className="text-sm text-gray-600">
                    Our system automatically extracts text content from your files.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-2">3. Chat</h3>
                  <p className="text-sm text-gray-600">
                    Ask questions in the chat about your documents and receive contextual responses.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-lg mb-2">4. Voice Input</h3>
                  <p className="text-sm text-gray-600">
                    Use the microphone button in chat to ask questions by speaking instead of typing.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm mb-8 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4">Tips for Better Document Usage</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Upload clear, well-scanned documents for better text extraction</li>
              <li>Use the "Using Documents" toggle in chat to control when the AI uses your materials</li>
              <li>When asking questions, be specific about which document you're referring to</li>
              <li>Click on source citations in AI responses to see which parts of your documents were referenced</li>
              <li>Upload a variety of materials on the same topic for more comprehensive answers</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Documents;
