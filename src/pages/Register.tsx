
import React from "react";
import Navbar from "@/components/layout/Navbar";
import RegisterForm from "@/components/auth/RegisterForm";
import Footer from "@/components/landing/Footer";
import { Link } from "react-router-dom";
import { Toaster } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  Info, 
  HelpCircle 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light flex flex-col items-center justify-center py-10">
        {/* Email verification alert */}
        <div className="max-w-md w-full mx-auto mb-6">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <AlertTitle className="text-amber-800">Email Verification Required</AlertTitle>
            <AlertDescription className="text-amber-700">
              After registration, please check your inbox (and spam folder) for a verification email.
              If you don't receive it, you can request another one from the login page.
            </AlertDescription>
          </Alert>
        </div>

        {/* School code help info */}
        <div className="max-w-md w-full mx-auto mb-6">
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <div className="flex justify-between items-start">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <AlertTitle>Need a School Code?</AlertTitle>
                  <AlertDescription className="text-blue-700 mt-1">
                    Teachers and students need a valid school code to register.
                  </AlertDescription>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-0 h-8">
                    <HelpCircle className="h-3.5 w-3.5 mr-1" />
                    <span className="text-xs">How to get a code</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>How to Get a School Code</DialogTitle>
                    <DialogDescription>
                      School codes connect you to your school during registration
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-2">
                    <div>
                      <h3 className="font-medium mb-2">For Teachers</h3>
                      <ul className="list-disc pl-5 space-y-1.5">
                        <li>Ask your school administrator who has already registered the school</li>
                        <li>They can generate a code from the School Settings page</li>
                        <li>Codes expire after 24 hours, so make sure to use it promptly</li>
                        <li>If a code expires, the administrator can generate a new one</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-2">For Students</h3>
                      <ul className="list-disc pl-5 space-y-1.5">
                        <li>Ask your teacher or school administrator for your school code</li>
                        <li>Your teacher can get the code from the school administrator</li>
                        <li>Enter the code during registration to connect to your school</li>
                      </ul>
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                      <div className="flex gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800">Important Note</h4>
                          <p className="text-sm text-amber-700 mt-1">
                            School codes are unique to each school and are required for registration. 
                            Without a valid code, you won't be able to complete the registration process.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button>Close</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <ul className="list-disc pl-5 space-y-1 mt-3 text-blue-700 text-sm">
              <li>For teachers: Get this code from your school administrator</li>
              <li>For students: Get this code from your teacher</li>
              <li>School administrators must first <Link to="/school-registration" className="font-medium underline">register their school</Link> to generate a code</li>
            </ul>
          </Alert>
        </div>

        {/* Test accounts notice */}
        <div className="max-w-md w-full mx-auto mb-6">
          <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-md shadow">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-800 font-medium">
                  Testing the application?
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  You can quickly create test accounts for all user roles (school admin, teacher, student) on our dedicated test page.
                </p>
                <div className="mt-2">
                  <Link 
                    to="/test-accounts" 
                    className="text-sm text-amber-800 font-semibold hover:text-amber-900 bg-amber-200 px-3 py-1 rounded-full transition-colors duration-200"
                  >
                    Create Test Accounts →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* School registration banner */}
        <div className="max-w-md w-full mx-auto mb-6">
          <div className="bg-blue-100 border border-blue-500 p-6 rounded-md shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-blue-500 text-white rounded-full p-2">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-blue-800">
                  Are you a School Administrator?
                </h3>
                <p className="mt-2 text-blue-700">
                  If you're registering on behalf of a school and need to set up an administrator account, please use our dedicated school registration page.
                </p>
                <p className="mt-2 text-sm text-blue-600 italic">
                  Teachers and students should register below after their school has been registered.
                </p>
                <div className="mt-4">
                  <Link 
                    to="/school-registration" 
                    className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors duration-200"
                  >
                    School Administrator Registration →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Registration form for teachers and students */}
        <div className="max-w-md w-full mx-auto mb-6">
          <div className="bg-white p-4 rounded-md shadow-md">
            <h2 className="text-lg font-semibold text-center mb-4">Teacher & Student Registration</h2>
            <p className="text-gray-600 text-sm mb-4 text-center">
              If your school is already registered on LearnAble, use the form below to create your teacher or student account.
            </p>
            <RegisterForm />
          </div>
        </div>
      </main>
      <Footer />
      <Toaster />
    </div>
  );
};

export default Register;
