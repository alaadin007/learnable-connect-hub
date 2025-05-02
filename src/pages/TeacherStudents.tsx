
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentManagement from "@/components/teacher/StudentManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";

const TeacherStudents = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold gradient-text">Student Management</h1>
          </div>
          
          <StudentManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TeacherStudents;
