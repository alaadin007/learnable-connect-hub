
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import TeacherManagement from "@/components/school-admin/TeacherManagement";
import AdminLayout from "@/components/layout/AdminLayout";
import SchoolCodeGenerator from "@/components/school-admin/SchoolCodeGenerator";

const AdminTeacherManagement = () => {
  const navigate = useNavigate();

  return (
    <AdminLayout
      title="Teacher Management"
      subtitle="Invite and manage teachers for your school"
    >
      <div className="mb-8">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => navigate('/admin', { state: { preserveContext: true } })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin
        </Button>
      </div>

      {/* School Code Generator - only render if we have a school ID */}
      <div className="mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-amber-200">
          <h2 className="text-xl font-semibold mb-4">School Invitation Code</h2>
          <p className="text-gray-600 mb-4">Share this code with teachers to join your school</p>
          <div className="max-w-md">
            <SchoolCodeGenerator />
          </div>
        </div>
      </div>

      <TeacherManagement />
    </AdminLayout>
  );
};

export default AdminTeacherManagement;
