
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvitationDetails = {
  invitation_id: string;
  school_id: string;
  school_name: string;
  email: string;
};

enum InvitationStatus {
  LOADING,
  VALID,
  INVALID,
  ACCEPTED,
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<InvitationStatus>(InvitationStatus.LOADING);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        toast.error("No invitation token provided");
        setStatus(InvitationStatus.INVALID);
        return;
      }
      
      try {
        // Use the RPC to verify the token
        const { data, error } = await supabase.rpc<InvitationDetails>(
          'verify_teacher_invitation',
          { token }
        );
        
        if (error) {
          console.error("Error verifying token:", error);
          toast.error("Invalid or expired invitation token");
          setStatus(InvitationStatus.INVALID);
          return;
        }
        
        if (!data) {
          toast.error("Invalid invitation token");
          setStatus(InvitationStatus.INVALID);
          return;
        }
        
        setInvitation(data);
        setStatus(InvitationStatus.VALID);
        
        // If user is already logged in and email matches, accept the invitation
        if (user && user.email === data.email) {
          handleAccept();
        } else if (user && user.email !== data.email) {
          toast.error(`You are logged in as ${user.email}, but this invitation is for ${data.email}. Please log out and try again.`);
        } else {
          setShowRegistration(true);
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        toast.error("Failed to verify invitation token");
        setStatus(InvitationStatus.INVALID);
      }
    };
    
    verifyToken();
  }, [token, user]);
  
  const handleAccept = async () => {
    if (!token) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.rpc('accept_teacher_invitation', { token });
      
      if (error) {
        console.error("Error accepting invitation:", error);
        toast.error(`Failed to accept invitation: ${error.message}`);
        return;
      }
      
      setStatus(InvitationStatus.ACCEPTED);
      toast.success("Invitation accepted successfully!");
      
      // Redirect to teacher dashboard after a delay
      setTimeout(() => {
        navigate("/teacher/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Error accepting invitation:", error);
      toast.error(`Failed to accept invitation: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;
    
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: 'teacher',
            school_code: null, // Will be set by accept_teacher_invitation
            school_name: invitation.school_name
          },
          emailRedirectTo: window.location.origin + '/teacher-invitation?token=' + token
        }
      });
      
      if (error) {
        console.error("Registration error:", error);
        toast.error(`Registration failed: ${error.message}`);
        return;
      }
      
      // If email confirmations are disabled, sign in and accept immediately
      if (data.session) {
        toast.success("Account created successfully!");
        
        // Accept the invitation
        await handleAccept();
      } else {
        // Email confirmations are enabled
        toast.success("Account created! Please check your email to confirm your account.");
        toast.info("Once confirmed, you can return here to accept the invitation.");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(`Registration failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitation) return;
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(invitation.email, password);
      
      if (error) {
        console.error("Login error:", error);
        toast.error(`Login failed: ${error.message}`);
        return;
      }
      
      // If login successful, accept the invitation
      await handleAccept();
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(`Login failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (status === InvitationStatus.LOADING) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Verifying Invitation</CardTitle>
          <CardDescription>Please wait while we verify your invitation</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // Invalid invitation
  if (status === InvitationStatus.INVALID) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive flex items-center justify-center">
            <XCircle className="mr-2 h-6 w-6" />
            Invalid Invitation
          </CardTitle>
          <CardDescription>This invitation is invalid or has expired</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Unable to process invitation</AlertTitle>
            <AlertDescription>
              The invitation link you used is invalid or has expired. Please contact your school administrator for a new invitation.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Accepted invitation
  if (status === InvitationStatus.ACCEPTED) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-success flex items-center justify-center">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            Invitation Accepted
          </CardTitle>
          <CardDescription>You have successfully joined {invitation?.school_name}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              You have been added as a teacher at {invitation?.school_name}. You will be redirected to your dashboard shortly.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => navigate("/teacher/dashboard")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Valid invitation - Show registration or login form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Teacher Invitation</CardTitle>
        <CardDescription>
          You've been invited to join {invitation?.school_name} as a teacher
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTitle>Invitation for {invitation?.email}</AlertTitle>
          <AlertDescription>
            {showRegistration 
              ? "Complete your account setup to accept this invitation." 
              : "Login to accept this invitation."}
          </AlertDescription>
        </Alert>
        
        {showRegistration ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Enter your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={invitation?.email || ''}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Create a password"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input 
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm your password"
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-bg" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account & Accept"
              )}
            </Button>
            <div className="text-center">
              <span className="text-sm text-gray-500">
                Already have an account?{" "}
                <Button variant="link" className="p-0" onClick={() => setShowRegistration(false)}>
                  Login
                </Button>
              </span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                value={invitation?.email || ''}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loginPassword">Password</Label>
              <Input 
                id="loginPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full gradient-bg" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging In...
                </>
              ) : (
                "Login & Accept"
              )}
            </Button>
            <div className="text-center">
              <span className="text-sm text-gray-500">
                Don't have an account yet?{" "}
                <Button variant="link" className="p-0" onClick={() => setShowRegistration(true)}>
                  Register
                </Button>
              </span>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default AcceptInvitation;
