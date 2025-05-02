
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/layout/Navbar";
import { BookOpen, FileText, MessageSquare, Users } from "lucide-react";
import { Link } from "react-router-dom";
import FileUpload from "@/components/documents/FileUpload";
import FileList from "@/components/documents/FileList";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription, SheetHeader } from "@/components/ui/sheet";

const Dashboard = () => {
  const { user, profile } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">My Documents</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {/* Activity summary */}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {/* Document count */}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Upload</CardTitle>
                      <CardDescription>Upload documents, images and other learning materials</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button className="w-full">
                            <FileText className="mr-2 h-4 w-4" />
                            Upload New File
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-md">
                          <SheetHeader>
                            <SheetTitle>Upload Document</SheetTitle>
                            <SheetDescription>
                              Upload PDF documents or images for your learning materials.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="py-6">
                            <FileUpload />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Assistant</CardTitle>
                      <CardDescription>Ask questions and get instant help</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      <Button asChild className="w-full">
                        <Link to="/chat">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Chat with AI
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>My Documents</CardTitle>
                        <CardDescription>
                          Manage your uploaded documents and learning materials
                        </CardDescription>
                      </div>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button>
                            <FileText className="mr-2 h-4 w-4" />
                            Upload Document
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="sm:max-w-md">
                          <SheetHeader>
                            <SheetTitle>Upload Document</SheetTitle>
                            <SheetDescription>
                              Upload PDF documents or images for your learning materials.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="py-6">
                            <FileUpload />
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FileList />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Upload Document</SheetTitle>
                      <SheetDescription>Upload PDF documents or images for your learning materials.</SheetDescription>
                    </SheetHeader>
                    <div className="py-6">
                      <FileUpload />
                    </div>
                  </SheetContent>
                </Sheet>
                
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/chat">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat with AI
                  </Link>
                </Button>

                {profile?.user_type === 'teacher' && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/teacher/students">
                      <Users className="mr-2 h-4 w-4" />
                      View Students
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
            
            {/* Additional sidebar components can go here */}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
