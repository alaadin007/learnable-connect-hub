import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Video, 
  Upload, 
  BarChart3, 
  Users, 
  Zap, 
  Brain,
  Search
} from "lucide-react";
import DocumentUploader from "@/components/ai-tutor/DocumentUploader";
import VideoUploader from "@/components/ai-tutor/VideoUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SharedLearningMaterialType } from "@/types/database";

interface Document {
  id: string;
  filename: string;
  file_type: string;
  created_at: string;
  processing_status: string;
}

interface Video {
  id: string;
  title: string;
  video_type: string;
  created_at: string;
  processing_status: string;
  youtube_id?: string;
}

const TeacherAITutor = () => {
  const { user, profile, schoolId } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("materials");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [sharedWithStudents, setSharedWithStudents] = useState<Set<string>>(new Set());
  const [selectedContent, setSelectedContent] = useState<Document | Video | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    loadMaterials();
  }, [user, navigate]);

  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      // Load documents
      const { data: documentsData, error: documentsError } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (videosError) throw videosError;
      setVideos(videosData || []);

      // Load shared materials
      const { data: sharedData, error: sharedError } = await supabase
        .from("shared_learning_materials")
        .select("content_id")
        .eq("teacher_id", user!.id);

      if (sharedError) throw sharedError;
      if (sharedData) {
        setSharedWithStudents(
          new Set(sharedData.map((item: SharedLearningMaterialType) => item.content_id))
        );
      }
    } catch (error) {
      console.error("Error loading materials:", error);
      toast.error("Failed to load your learning materials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUploaded = (documentId: string, filename: string) => {
    // Refresh the document list
    loadMaterials();
  };

  const handleVideoUploaded = (videoId: string, type: 'youtube' | 'lecture', title: string) => {
    // Refresh the video list
    loadMaterials();
  };

  const handleShareDocument = (document: Document) => {
    setSelectedContent(document);
    setShareDialogOpen(true);
  };

  const handleShareVideo = (video: Video) => {
    setSelectedContent(video);
    setShareDialogOpen(true);
  };

  const handleShareWithStudents = async () => {
    if (!selectedContent || !schoolId) return;

    try {
      // Create a new shared material record
      const contentType = 'filename' in selectedContent ? 'document' as const : 'video' as const;

      const { error } = await supabase
        .from("shared_learning_materials")
        .insert({
          teacher_id: user!.id,
          school_id: schoolId,
          content_id: selectedContent.id,
          content_type: contentType,
          note: shareNote,
          shared_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update local state
      setSharedWithStudents(
        new Set([...Array.from(sharedWithStudents), selectedContent.id])
      );

      toast.success("Material shared successfully with students");
      setShareDialogOpen(false);
      setShareNote("");
    } catch (error) {
      console.error("Error sharing material:", error);
      toast.error("Failed to share material with students");
    }
  };

  const handleUnshareContent = async (contentId: string) => {
    try {
      const { error } = await supabase
        .from("shared_learning_materials")
        .delete()
        .eq("content_id", contentId)
        .eq("teacher_id", user!.id);

      if (error) throw error;

      // Update local state
      const updatedShared = new Set(Array.from(sharedWithStudents));
      updatedShared.delete(contentId);
      setSharedWithStudents(updatedShared);

      toast.success("Material is no longer shared with students");
    } catch (error) {
      console.error("Error unsharing material:", error);
      toast.error("Failed to update sharing settings");
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">
              Teacher AI Assistant
            </h1>
            <p className="text-learnable-gray">
              Create, manage, and share learning materials with AI assistance for your students.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Teacher Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setActiveTab("materials")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Learning Materials
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setActiveTab("upload")}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Content
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => setActiveTab("students")}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Student Management
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate("/teacher/analytics")}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics Dashboard
                    </Button>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium mb-3">AI Teaching Assistant</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start text-sm"
                        onClick={() => setActiveTab("generate")}
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        Create Lesson Materials
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full justify-start text-sm"
                        onClick={() => setActiveTab("assessments")}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Generate Assessments
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main content area */}
            <div className="lg:col-span-9">
              <Card>
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-xl">
                    {activeTab === "materials" && "Learning Materials"}
                    {activeTab === "upload" && "Upload Content"}
                    {activeTab === "students" && "Student Management"}
                    {activeTab === "generate" && "Generate Learning Materials"}
                    {activeTab === "assessments" && "Generate Assessments"}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <TabsContent value="materials" className={activeTab === "materials" ? "block mt-6" : "hidden"}>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                        <Input
                          placeholder="Search materials..."
                          className="pl-10"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <Tabs defaultValue="documents" className="mt-6">
                      <TabsList className="mb-4">
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="videos">Videos</TabsTrigger>
                      </TabsList>

                      <TabsContent value="documents">
                        {isLoading ? (
                          <div className="text-center py-8">Loading documents...</div>
                        ) : filteredDocuments.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No documents found</p>
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => setActiveTab("upload")}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Documents
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredDocuments.map((doc) => (
                              <div
                                key={doc.id}
                                className="border rounded-md p-4 flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  <FileText className="h-8 w-8 text-blue-500 mr-3" />
                                  <div>
                                    <h3 className="font-medium">{doc.filename}</h3>
                                    <p className="text-xs text-gray-500">
                                      Uploaded on {formatDate(doc.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {sharedWithStudents.has(doc.id) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUnshareContent(doc.id)}
                                    >
                                      Unshare
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleShareDocument(doc)}
                                    >
                                      Share with Students
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="videos">
                        {isLoading ? (
                          <div className="text-center py-8">Loading videos...</div>
                        ) : filteredVideos.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-gray-500">No videos found</p>
                            <Button
                              variant="outline"
                              className="mt-4"
                              onClick={() => setActiveTab("upload")}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Videos
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredVideos.map((video) => (
                              <div
                                key={video.id}
                                className="border rounded-md p-4 flex items-center justify-between"
                              >
                                <div className="flex items-center">
                                  <Video className="h-8 w-8 text-blue-500 mr-3" />
                                  <div>
                                    <h3 className="font-medium">{video.title}</h3>
                                    <p className="text-xs text-gray-500">
                                      {video.video_type === 'youtube' ? 'YouTube Video' : 'Uploaded Video'} • {formatDate(video.created_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {sharedWithStudents.has(video.id) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUnshareContent(video.id)}
                                    >
                                      Unshare
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleShareVideo(video)}
                                    >
                                      Share with Students
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="upload" className={activeTab === "upload" ? "block mt-6" : "hidden"}>
                    <Tabs defaultValue="document">
                      <TabsList className="mb-4">
                        <TabsTrigger value="document">Upload Document</TabsTrigger>
                        <TabsTrigger value="video">Upload Video</TabsTrigger>
                      </TabsList>

                      <TabsContent value="document">
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-2">Document Upload</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Upload PDFs, Word documents, or text files to share with your students and use with the AI tutor.
                          </p>
                          <DocumentUploader onDocumentUploaded={handleDocumentUploaded} />
                        </div>
                      </TabsContent>

                      <TabsContent value="video">
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-2">Video Upload</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Upload videos or add YouTube links to share with your students and use with the AI tutor.
                          </p>
                          <VideoUploader onVideoUploaded={handleVideoUploaded} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="students" className={activeTab === "students" ? "block mt-6" : "hidden"}>
                    <div className="text-center py-12">
                      <Users className="h-16 w-16 mx-auto text-blue-500 opacity-50 mb-4" />
                      <h2 className="text-xl font-medium mb-2">Student Management</h2>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Manage student access to your AI-enhanced learning materials.
                      </p>
                      <Button onClick={() => navigate("/teacher/students")}>
                        Go to Student Management
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="generate" className={activeTab === "generate" ? "block mt-6" : "hidden"}>
                    <div className="text-center py-12">
                      <Brain className="h-16 w-16 mx-auto text-blue-500 opacity-50 mb-4" />
                      <h2 className="text-xl font-medium mb-2">AI Content Generation</h2>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Use AI to generate lesson plans, study guides, and learning materials for your students.
                      </p>
                      <p className="text-sm text-gray-400 mb-4">
                        This feature is coming soon. Upload your own content for now.
                      </p>
                      <Button variant="outline" onClick={() => setActiveTab("upload")}>
                        Upload Your Content
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="assessments" className={activeTab === "assessments" ? "block mt-6" : "hidden"}>
                    <div className="text-center py-12">
                      <Zap className="h-16 w-16 mx-auto text-blue-500 opacity-50 mb-4" />
                      <h2 className="text-xl font-medium mb-2">AI Assessment Generation</h2>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Generate quizzes, tests, and interactive assessments based on your teaching materials.
                      </p>
                      <p className="text-sm text-gray-400 mb-4">
                        This feature is coming soon. Create assessments manually for now.
                      </p>
                      <Button onClick={() => navigate("/teacher/assessments")}>
                        Go to Assessments
                      </Button>
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Share with Students Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with Students</DialogTitle>
            <DialogDescription>
              This material will be available to all students in your school.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedContent && (
              <div className="flex items-center p-3 bg-blue-50 rounded-md">
                {'filename' in selectedContent ? (
                  <FileText className="h-5 w-5 text-blue-500 mr-2" />
                ) : (
                  <Video className="h-5 w-5 text-blue-500 mr-2" />
                )}
                <div>
                  <p className="font-medium">
                    {'filename' in selectedContent ? selectedContent.filename : selectedContent.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(selectedContent.created_at)}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="share-note">Note for Students (Optional)</Label>
              <Textarea
                id="share-note"
                placeholder="Add instructions or context for this material..."
                value={shareNote}
                onChange={(e) => setShareNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShareWithStudents}>Share Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAITutor;
