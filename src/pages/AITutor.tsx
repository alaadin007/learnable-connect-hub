import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, MessageSquare, Layers } from "lucide-react";
import DocumentUploader from "@/components/ai-tutor/DocumentUploader";
import VideoUploader from "@/components/ai-tutor/VideoUploader";
import AIChat from "@/components/ai-tutor/AIChat";
import FlashcardCreator from "@/components/ai-tutor/FlashcardCreator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define the content types
type ContentType = "document" | "video" | null;

const AITutor = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [activeTab, setActiveTab] = useState<string>("chat");
  const [contentType, setContentType] = useState<ContentType>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const [contentName, setContentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(searchParams.get("conversationId"));
  
  // Load content information from URL params
  useEffect(() => {
    const contentTypeParam = searchParams.get("contentType") as ContentType;
    const contentIdParam = searchParams.get("contentId");
    
    if (contentTypeParam && contentIdParam) {
      setContentType(contentTypeParam);
      setContentId(contentIdParam);
      loadContentDetails(contentTypeParam, contentIdParam);
    }
    
    const conversationIdParam = searchParams.get("conversationId");
    if (conversationIdParam) {
      setConversationId(conversationIdParam);
      setActiveTab("chat");
    }
  }, [searchParams]);
  
  // Load user's contents when component mounts
  useEffect(() => {
    if (user) {
      loadUserContents();
    } else {
      navigate("/login", { state: { from: "/ai-tutor" } });
    }
  }, [user, navigate]);
  
  const loadUserContents = async () => {
    setIsLoading(true);
    try {
      // Load documents
      const { data: docsData, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (docsError) throw docsError;
      setDocuments(docsData || []);
      
      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      
      if (videosError) throw videosError;
      setVideos(videosData || []);
    } catch (error) {
      console.error("Error loading user contents:", error);
      toast.error("Failed to load your learning materials");
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadContentDetails = async (type: ContentType, id: string) => {
    try {
      if (type === "document") {
        const { data, error } = await supabase
          .from("documents")
          .select("filename")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setContentName(data?.filename || "Document");
      } else if (type === "video") {
        const { data, error } = await supabase
          .from("videos")
          .select("title")
          .eq("id", id)
          .single();
          
        if (error) throw error;
        setContentName(data?.title || "Video");
      }
    } catch (error) {
      console.error("Error loading content details:", error);
      // Keep going even if we can't load the name
    }
  };
  
  const handleDocumentSelected = (id: string, filename: string) => {
    setContentType("document");
    setContentId(id);
    setContentName(filename);
    
    // Update URL to reflect selected content
    const params = new URLSearchParams();
    params.set("contentType", "document");
    params.set("contentId", id);
    setSearchParams(params);
    
    // Switch to chat tab to interact with the document
    setActiveTab("chat");
    
    toast.success("Document selected for AI tutoring");
  };
  
  const handleVideoSelected = (id: string, type: 'youtube' | 'lecture', title: string) => {
    setContentType("video");
    setContentId(id);
    setContentName(title);
    
    // Update URL to reflect selected content
    const params = new URLSearchParams();
    params.set("contentType", "video");
    params.set("contentId", id);
    setSearchParams(params);
    
    // Switch to chat tab to interact with the video
    setActiveTab("chat");
    
    toast.success("Video selected for AI tutoring");
  };
  
  const handleConversationCreated = (id: string) => {
    setConversationId(id);
    
    // Update URL to include conversation ID
    const params = new URLSearchParams(searchParams);
    params.set("conversationId", id);
    setSearchParams(params);
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleRemoveContent = () => {
    setContentType(null);
    setContentId(null);
    setContentName(null);
    
    // Remove content params from URL
    const params = new URLSearchParams();
    if (conversationId) {
      params.set("conversationId", conversationId);
    }
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">AI Learning Assistant</h1>
            <p className="text-learnable-gray">
              Get help with your studies by using AI to understand documents, videos, and create study materials.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar - Study material selection */}
            <div className="lg:col-span-3 space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Study Materials</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="documents" className="space-y-4">
                    <TabsList className="grid grid-cols-2">
                      <TabsTrigger value="documents" className="flex items-center justify-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Documents</span>
                      </TabsTrigger>
                      <TabsTrigger value="videos" className="flex items-center justify-center">
                        <Video className="h-4 w-4 mr-2" />
                        <span>Videos</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="documents" className="space-y-4">
                      <DocumentUploader onDocumentUploaded={handleDocumentSelected} />
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">My Documents</h3>
                        {documents.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No documents uploaded yet
                          </p>
                        ) : (
                          documents.map(doc => (
                            <div
                              key={doc.id}
                              className={`p-2 rounded-md text-sm flex items-center cursor-pointer hover:bg-gray-100 ${
                                contentType === 'document' && contentId === doc.id ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                              onClick={() => handleDocumentSelected(doc.id, doc.filename)}
                            >
                              <FileText className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                              <span className="truncate">{doc.filename}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="videos" className="space-y-4">
                      <VideoUploader onVideoUploaded={handleVideoSelected} />
                      
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">My Videos</h3>
                        {videos.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No videos added yet
                          </p>
                        ) : (
                          videos.map(video => (
                            <div
                              key={video.id}
                              className={`p-2 rounded-md text-sm flex items-center cursor-pointer hover:bg-gray-100 ${
                                contentType === 'video' && contentId === video.id ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                              onClick={() => handleVideoSelected(video.id, video.video_type, video.title)}
                            >
                              <Video className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                              <span className="truncate">{video.title}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              
              {contentType && contentId && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Selected Material</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 bg-blue-50 rounded-md flex items-start">
                      {contentType === "document" ? (
                        <FileText className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Video className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-grow">
                        <p className="font-medium mb-1">{contentName}</p>
                        <p className="text-xs text-gray-500 mb-3">
                          {contentType === "document" ? "PDF Document" : "Video"}
                        </p>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={handleRemoveContent}
                          className="w-full text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-9">
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-0 border-b">
                  <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="chat" className="flex items-center justify-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat with AI
                      </TabsTrigger>
                      <TabsTrigger value="flashcards" className="flex items-center justify-center">
                        <Layers className="h-4 w-4 mr-2" />
                        Flashcards
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                
                <CardContent className="flex-grow p-0 overflow-hidden">
                  <div className="h-full">
                    <TabsContent value="chat" className="h-full m-0">
                      <AIChat 
                        conversationId={conversationId || undefined}
                        onConversationCreated={handleConversationCreated}
                        contextDocumentId={contentType === "document" ? contentId || undefined : undefined}
                        contextVideoId={contentType === "video" ? contentId || undefined : undefined}
                        initialContext={contentName ? `I'm here to help you with your ${contentType}: "${contentName}". What would you like to know about it?` : undefined}
                      />
                    </TabsContent>
                    
                    <TabsContent value="flashcards" className="h-full m-0 p-6">
                      <FlashcardCreator
                        documentId={contentType === "document" ? contentId || undefined : undefined}
                        videoId={contentType === "video" ? contentId || undefined : undefined}
                      />
                    </TabsContent>
                  </div>
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

export default AITutor;
