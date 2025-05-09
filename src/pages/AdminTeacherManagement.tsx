
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import AdminNavbar from "@/components/school-admin/AdminNavbar";
import SchoolCodeGenerator from "@/components/school-admin/SchoolCodeGenerator";
import { useAuth } from "@/contexts/AuthContext";

const AdminTeacherManagement = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Use hardcoded or local storage fallback instead of profile fetching
  const schoolId = localStorage.getItem('schoolId') || "demo-school-id";

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

          {/* School Code Generator - only render if we have a school ID */}
          <div className="mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">School Invitation Code</h2>
              <p className="text-gray-600 mb-4">Share this code with teachers to join your school</p>
              <div className="max-w-md">
                <SchoolCodeGenerator />
              </div>
            </div>
          </div>

          <TeacherManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeacherManagement;
