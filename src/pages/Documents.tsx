
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FileUpload from '@/components/documents/FileUpload';
import FileList from '@/components/documents/FileList';

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
              Upload and manage your learning materials. Files you upload will be processed
              and can be used by our AI assistant to provide more personalized help.
            </p>
          </div>
          
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <h3 className="font-medium text-lg mb-2">3. Learning</h3>
                  <p className="text-sm text-gray-600">
                    The AI assistant uses your materials to provide more personalized and relevant answers.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Documents;
