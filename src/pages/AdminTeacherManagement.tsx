
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";

const AdminTeacherManagement = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={() => navigate('/admin', { state: { preserveContext: true } })}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
            <h1 className="text-3xl font-bold">Teacher Management</h1>
          </div>
          
          <AdminNavbar className="mb-8" />
          
          <TeacherManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeacherManagement;
