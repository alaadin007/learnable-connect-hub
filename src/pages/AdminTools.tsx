
import React from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import UserRemovalTool from "@/components/admin/UserRemovalTool";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const AdminTools = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();

  // Check if user has admin role
  React.useEffect(() => {
    if (userRole && userRole !== "school") {
      navigate("/");
    }
  }, [userRole, navigate]);

  if (!userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You must be logged in to access this page.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Admin Tools</h1>
            <p className="text-gray-600">
              Advanced tools for system administration
            </p>
          </div>

          <div className="grid gap-6 md:gap-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">User Management</h2>
              <UserRemovalTool />
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTools;
