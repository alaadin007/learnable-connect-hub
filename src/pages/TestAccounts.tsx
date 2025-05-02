
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Mic, FileText, Star, BarChart } from "lucide-react";

const TestAccounts = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold gradient-text mb-8">Test Accounts</h1>
          
          <div className="space-y-8">
            <Card>
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
                    </TableRow>
                    <TableRow>
                      <TableCell>Teacher</TableCell>
                      <TableCell>teacher@testschool.edu</TableCell>
                      <TableCell>password123</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Teacher Access</Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>student@testschool.edu</TableCell>
                      <TableCell>password123</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Student Access</Badge>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            
            <Card>
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
                </div>
              </CardContent>
            </Card>
            
            <Card>
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
                      Ask questions via text or using the voice query feature, try document integration
                    </p>
                  </li>
                  <li>
                    <p className="font-medium">Test analytics features (admin/teacher accounts)</p>
                    <p className="text-gray-500 mt-1">
                      Filter data by student, teacher, date range, export reports
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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
