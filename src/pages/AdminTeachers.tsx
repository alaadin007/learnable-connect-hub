
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import TeacherInvitation from "@/components/admin/TeacherInvitation";
import { Loader2 } from "lucide-react";

const AdminTeachers = () => {
  const { user, profile } = useAuth();
  const { isAdmin, isSupervisor, isLoading: rbacLoading } = useRBAC();

  if (rbacLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-learnable-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin && !isSupervisor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow bg-learnable-super-light py-8">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h1>
              <p className="text-learnable-gray">
                You do not have permission to access teacher management.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Teacher Management</h1>
            <p className="text-learnable-gray">
              Add or invite teachers to join your school
            </p>
          </div>
          
          <TeacherInvitation />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeachers;
