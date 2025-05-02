import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, FileText, Star, BarChart, Volume, Users, FileCheck, Lock, BarChart2, ArrowRightLeft, Brain, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TestAccounts = () => {
  const { setTestUser } = useAuth();
  const navigate = useNavigate();

  // Handler for direct login
  const handleDirectLogin = async (type: 'school' | 'teacher' | 'student', schoolIndex: number = 0) => {
    try {
      await setTestUser(type, schoolIndex);
      
      // Navigate based on user type
      if (type === 'school') {
        navigate('/admin');
      } else if (type === 'teacher') {
        navigate('/teacher/analytics');
      } else {
        navigate('/dashboard');
      }
      
      toast.success(`Logged in as ${type === 'school' ? 'School Admin' : type === 'teacher' ? 'Teacher' : 'Student'}`);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to log in");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold gradient-text mb-8">Test Accounts</h1>
          
          <Tabs defaultValue="accounts">
            <TabsList className="mb-6">
              <TabsTrigger value="accounts">Test Accounts</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="testing">Testing Scenarios</TabsTrigger>
            </TabsList>
            
            <TabsContent value="accounts">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Test Account Credentials</CardTitle>
                  <CardDescription>
                    Use these accounts to test different roles in the LearnAble platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Access Level</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>School Admin</TableCell>
                        <TableCell>admin@testschool.edu</TableCell>
                        <TableCell>password123</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Full Admin Access</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="secondary" 
                            className="bg-learnable-blue text-white hover:bg-learnable-blue-dark"
                            onClick={() => handleDirectLogin('school', 0)}
                          >
                            Login as Admin
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Teacher</TableCell>
                        <TableCell>teacher@testschool.edu</TableCell>
                        <TableCell>password123</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Teacher Access</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="secondary" 
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => handleDirectLogin('teacher', 0)}
                          >
                            Login as Teacher
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>student@testschool.edu</TableCell>
                        <TableCell>password123</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Student Access</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="secondary" 
                            className="bg-purple-600 text-white hover:bg-purple-700"
                            onClick={() => handleDirectLogin('student', 0)}
                          >
                            Login as Student
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Second School Admin</TableCell>
                        <TableCell>admin@secondschool.edu</TableCell>
                        <TableCell>password123</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Full Admin Access</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="secondary" 
                            className="bg-learnable-blue text-white hover:bg-learnable-blue-dark"
                            onClick={() => handleDirectLogin('school', 1)}
                          >
                            Login as Admin
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Second School Teacher</TableCell>
                        <TableCell>teacher@secondschool.edu</TableCell>
                        <TableCell>password123</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Teacher Access</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="secondary" 
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={() => handleDirectLogin('teacher', 1)}
                          >
                            Login as Teacher
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="features">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Key Features Available for Testing</CardTitle>
                  <CardDescription>
                    These features are fully implemented and ready for testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <FileText className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Document Integration</h3>
                        <p className="text-gray-500 mt-1">
                          Upload your own study materials and let the AI use them as context for answers
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <Mic className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Voice Query Support</h3>
                        <p className="text-gray-500 mt-1">
                          Speak your questions directly to the AI using the microphone button in the chat interface
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <Volume className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Text-to-Speech Responses</h3>
                        <p className="text-gray-500 mt-1">
                          Listen to AI responses with high-quality text-to-speech audio playback
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <Star className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Conversation Management</h3>
                        <p className="text-gray-500 mt-1">
                          Star important conversations, categorize them, and add tags for easy reference
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <BarChart className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Analytics Dashboard</h3>
                        <p className="text-gray-500 mt-1">
                          View detailed learning analytics with filters for students, teachers, and date ranges
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <Lock className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Multi-tenant Security</h3>
                        <p className="text-gray-500 mt-1">
                          Strict data separation ensures schools can only access their own data
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <ArrowRightLeft className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Bidirectional Voice Interface</h3>
                        <p className="text-gray-500 mt-1">
                          Complete voice conversation cycle with both speech recognition and text-to-speech
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-learnable-blue-light rounded-lg">
                        <Brain className="h-6 w-6 text-learnable-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Adaptive Learning</h3>
                        <p className="text-gray-500 mt-1">
                          AI adapts to student learning patterns and provides personalized assistance
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="testing">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Testing Scenarios</CardTitle>
                  <CardDescription>
                    Comprehensive testing scenarios to verify system functionality
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-medium flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-learnable-blue" />
                        Multi-tenant Data Separation
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ol className="space-y-3 list-decimal pl-5">
                          <li>
                            <p>Log in as admin@testschool.edu and view analytics dashboard</p>
                          </li>
                          <li>
                            <p>Log out and log in as admin@secondschool.edu to verify different data is shown</p>
                          </li>
                          <li>
                            <p>As a teacher from one school, verify you cannot see data from another school</p>
                          </li>
                          <li>
                            <p>Test teacher invites and student registration between separate school accounts</p>
                          </li>
                        </ol>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-medium flex items-center gap-2 mb-3">
                        <FileCheck className="h-5 w-5 text-learnable-blue" />
                        Document Processing Testing
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ol className="space-y-3 list-decimal pl-5">
                          <li>
                            <p>Upload various document formats (PDF, images with text, Word files)</p>
                          </li>
                          <li>
                            <p>Test AI responses with document integration enabled vs. disabled</p>
                          </li>
                          <li>
                            <p>Upload documents with complex formatting, tables, and images</p>
                          </li>
                          <li>
                            <p>Verify document citations and source references in AI responses</p>
                          </li>
                          <li>
                            <p>Check processing time and accuracy for different document types and sizes</p>
                          </li>
                        </ol>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-medium flex items-center gap-2 mb-3">
                        <Mic className="h-5 w-5 text-learnable-blue" />
                        Voice Features Testing
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ol className="space-y-3 list-decimal pl-5">
                          <li>
                            <p>Test voice queries in different browsers (Chrome, Firefox, Safari)</p>
                          </li>
                          <li>
                            <p>Try different speaking speeds and accents to test transcription accuracy</p>
                          </li>
                          <li>
                            <p>Test text-to-speech playback on various devices and browsers</p>
                          </li>
                          <li>
                            <p>Verify voice features work with longer questions and various subject matters</p>
                          </li>
                          <li>
                            <p>Test complete voice conversation cycle (speaking questions and listening to answers)</p>
                          </li>
                        </ol>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-xl font-medium flex items-center gap-2 mb-3">
                        <BarChart2 className="h-5 w-5 text-learnable-blue" />
                        Analytics Testing
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ol className="space-y-3 list-decimal pl-5">
                          <li>
                            <p>Create multiple study sessions with different topics</p>
                          </li>
                          <li>
                            <p>Test data filtering by date range, student, and teacher</p>
                          </li>
                          <li>
                            <p>Verify analytics data updates properly after new study sessions</p>
                          </li>
                          <li>
                            <p>Test analytics exports in various formats</p>
                          </li>
                          <li>
                            <p>Compare teacher vs. admin analytics views</p>
                          </li>
                          <li>
                            <p>Verify learning pattern insights and trend analysis over time</p>
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-medium flex items-center gap-2 mb-3">
                        <Clock className="h-5 w-5 text-learnable-blue" />
                        Performance Testing
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <ol className="space-y-3 list-decimal pl-5">
                          <li>
                            <p>Test response times with multiple concurrent users</p>
                          </li>
                          <li>
                            <p>Measure document processing performance with large files</p>
                          </li>
                          <li>
                            <p>Test analytics dashboard loading times with extensive data</p>
                          </li>
                          <li>
                            <p>Verify real-time voice transcription performance</p>
                          </li>
                          <li>
                            <p>Test text-to-speech generation speed and quality</p>
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Collection</CardTitle>
                  <CardDescription>
                    Guidelines for gathering feedback during testing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Teacher Feedback</h3>
                      <p className="text-gray-600 mt-1">
                        When testing with teachers, collect feedback on:
                      </p>
                      <ul className="mt-2 space-y-2 list-disc pl-5">
                        <li>Analytics dashboard usefulness and clarity</li>
                        <li>Quality and educational value of AI responses</li>
                        <li>Ease of student management and invitation process</li>
                        <li>Document upload and context retrieval effectiveness</li>
                        <li>Voice interface usability in classroom settings</li>
                        <li>Suggestions for additional features or improvements</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium">Student Feedback</h3>
                      <p className="text-gray-600 mt-1">
                        When testing with students, collect feedback on:
                      </p>
                      <ul className="mt-2 space-y-2 list-disc pl-5">
                        <li>Chat interface usability and responsiveness</li>
                        <li>Voice feature accuracy and convenience</li>
                        <li>Quality and helpfulness of AI responses</li>
                        <li>Conversation organization and history features</li>
                        <li>Text-to-speech clarity and natural sound</li>
                        <li>Overall learning experience and engagement</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Testing Instructions</CardTitle>
              <CardDescription>
                Follow these steps to test the platform effectively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4 list-decimal pl-5">
                <li>
                  <p className="font-medium">Log in with desired test account</p>
                  <p className="text-gray-500 mt-1">
                    Choose from admin, teacher, or student depending on which perspective you want to test
                  </p>
                </li>
                <li>
                  <p className="font-medium">Explore the AI chat interface</p>
                  <p className="text-gray-500 mt-1">
                    Ask questions via text or using the voice query feature, try document integration, and listen to AI responses with text-to-speech
                  </p>
                </li>
                <li>
                  <p className="font-medium">Test bidirectional voice conversations</p>
                  <p className="text-gray-500 mt-1">
                    Have complete voice-based conversations by speaking questions and listening to AI responses
                  </p>
                </li>
                <li>
                  <p className="font-medium">Test analytics features (admin/teacher accounts)</p>
                  <p className="text-gray-500 mt-1">
                    Filter data by student, teacher, date range, export reports, and analyze learning patterns
                  </p>
                </li>
                <li>
                  <p className="font-medium">Test multi-tenant data separation</p>
                  <p className="text-gray-500 mt-1">
                    Log in with accounts from different schools to verify proper data isolation
                  </p>
                </li>
                <li>
                  <p className="font-medium">Test document integration</p>
                  <p className="text-gray-500 mt-1">
                    Upload documents and verify that the AI properly uses them as context for responding to questions
                  </p>
                </li>
                <li>
                  <p className="font-medium">Report any issues</p>
                  <p className="text-gray-500 mt-1">
                    Use the contact form to report bugs or suggest improvements
                  </p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
