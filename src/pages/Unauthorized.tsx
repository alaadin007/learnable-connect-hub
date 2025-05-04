
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, isTestUser } = useAuth();
  
  const goBack = () => navigate(-1);
  
  const goToDashboard = () => {
    // Redirect to the appropriate dashboard based on user role
    if (userRole === "school") {
      navigate("/admin");
    } else if (userRole === "teacher") {
      navigate("/teacher/analytics");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6 py-8 bg-white shadow-md rounded-lg">
        <Alert variant="warning" className="mb-6 border-yellow-400 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-700">Access limited</AlertTitle>
          <AlertDescription className="text-yellow-700">
            You're trying to access a page with different permission requirements
          </AlertDescription>
        </Alert>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Limited</h2>
          
          <p className="mb-6 text-gray-600">
            You're currently signed in as a <span className="font-medium">{userRole}</span> user.
          </p>
          
          {isTestUser && (
            <div className="mb-6 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
              <p className="font-medium">You're using a test account as: {userRole}</p>
              <p className="mt-1">In this update, test accounts now have full access to all pages.</p>
              <p className="mt-1 font-bold">Try refreshing the page or clicking the Home button below.</p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={goBack}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>
            
            <Button 
              onClick={goToDashboard}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Home className="h-4 w-4" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
