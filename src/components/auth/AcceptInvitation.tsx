
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase, TeacherInvitationResult } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface InvitationData {
  invitation_id: string;
  school_id: string;
  school_name: string;
  email: string;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, refreshUserData } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  
  // Verify the invitation token
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("No invitation token provided");
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc("verify_teacher_invitation", {
          token
        });
        
        if (error) throw error;
        
        // Type checking and validation
        if (data && Array.isArray(data) && data.length > 0) {
          // Cast the data to the expected type for clarity
          const invitationData = data as unknown as TeacherInvitationResult[];
          setInvitation(invitationData[0]);
        } else {
          throw new Error("Invalid invitation data");
        }
      } catch (error: any) {
        console.error("Error verifying invitation:", error);
        setError(error.message || "Invalid or expired invitation");
      } finally {
        setIsLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);
  
  const handleAcceptInvitation = async () => {
    if (!token || !user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("accept_teacher_invitation", {
        token
      });
      
      if (error) throw error;
      
      toast.success("You've successfully joined as a teacher");
      // Refresh user data to update roles and permissions
      await refreshUserData();
      
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(error.message || "Failed to accept invitation");
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardHeader>
          <CardTitle>Verifying invitation...</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="animate-pulse">Loading...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (error || !invitation) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardHeader>
          <CardTitle>Invalid Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error || "This invitation is invalid or has expired."}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate("/login")} variant="outline" className="w-full">
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="max-w-md w-full mx-auto">
      <CardHeader>
        <CardTitle>Accept Teacher Invitation</CardTitle>
        <CardDescription>Join {invitation?.school_name} as a teacher</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium">School:</h3>
          <p>{invitation?.school_name}</p>
        </div>
        <div>
          <h3 className="font-medium">Email:</h3>
          <p>{invitation?.email}</p>
        </div>
        
        {!user ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-yellow-800">
              You need to sign up or log in with <strong>{invitation?.email}</strong> to accept this invitation.
            </p>
          </div>
        ) : user.email !== invitation?.email ? (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-red-800">
              You're currently logged in as {user.email}, but this invitation was sent to {invitation?.email}.
              Please log in with the correct email address.
            </p>
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {user && user.email === invitation?.email && (
          <Button 
            onClick={handleAcceptInvitation} 
            className="w-full gradient-bg"
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Accept Invitation"}
          </Button>
        )}
        
        {!user && invitation && (
          <>
            <Button 
              onClick={() => navigate(`/register?email=${encodeURIComponent(invitation.email)}`)} 
              className="w-full gradient-bg"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Register
            </Button>
            <Button 
              onClick={() => navigate(`/login?email=${encodeURIComponent(invitation.email)}`)} 
              variant="outline" 
              className="w-full"
            >
              Already have an account? Log in
            </Button>
          </>
        )}
        
        {user && invitation && user.email !== invitation.email && (
          <Button 
            onClick={() => navigate("/login")} 
            variant="outline" 
            className="w-full"
          >
            Log in with correct account
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default AcceptInvitation;
