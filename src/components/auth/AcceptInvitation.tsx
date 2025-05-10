
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, School } from 'lucide-react';

// Define the type for invitation info
interface TeacherInvitationInfo {
  invitation_id: string;
  school_id: string;
  school_name: string;
  email: string;
  role: string;
}

const AcceptInvitation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<TeacherInvitationInfo | null>(null);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  useEffect(() => {
    if (token) {
      verifyInvitation(token);
    } else {
      setError("Missing invitation token");
      setIsLoading(false);
    }
  }, [token]);
  
  const verifyInvitation = async (token: string) => {
    try {
      // Call the RPC function to verify the token
      const { data, error } = await supabase.rpc('verify_teacher_invitation', {
        token
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Since the data is returned as an array but we only need one item,
        // let's cast it properly
        const invitationData = data[0] as TeacherInvitationInfo;
        setInvitationInfo(invitationData);
      } else {
        throw new Error("Invalid or expired invitation");
      }
    } catch (err: any) {
      console.error("Error verifying invitation:", err);
      setError(err.message || "Failed to verify invitation");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invitationInfo) return;
    
    setIsSubmitting(true);
    try {
      // First register the new teacher account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitationInfo.email,
        password: password,
        options: {
          data: {
            full_name: name,
            user_type: invitationInfo.role || 'teacher',
            school_id: invitationInfo.school_id,
            school_name: invitationInfo.school_name
          }
        }
      });
      
      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error("Failed to create account");
      }
      
      // Now accept the invitation with the new user
      const { error: acceptError } = await supabase.functions.invoke('accept-teacher-invitation', {
        body: { token }
      });
      
      if (acceptError) {
        console.warn("Warning accepting invitation:", acceptError);
        // Continue anyway - the user is created
      }
      
      setIsSuccess(true);
      toast.success("Account created successfully! Please check your email for verification.");
      
      // Redirect after a delay
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      toast.error(err.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Verifying Invitation</CardTitle>
          <CardDescription>Please wait while we verify your invitation</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-red-600">Invitation Error</CardTitle>
          <CardDescription>There was a problem with your invitation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <p className="text-gray-600">
            The invitation may have expired or is invalid. Please contact your school administrator for a new invitation.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/login')} className="w-full">
            Return to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  if (isSuccess) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Account Created!</CardTitle>
          <CardDescription>Your teacher account has been created successfully</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Welcome to {invitationInfo?.school_name}!</h3>
            <p className="text-center text-gray-600 mb-4">
              Please check your email to verify your account. Once verified, you can log in to access your teacher dashboard.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Join {invitationInfo?.school_name}</CardTitle>
        <CardDescription>Complete your teacher account setup</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 bg-blue-50 p-4 rounded-lg mb-6">
            <School className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-blue-800 font-medium">Teacher Invitation</p>
              <p className="text-sm text-blue-600">You've been invited to join as a teacher at {invitationInfo?.school_name}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={invitationInfo?.email || ''} 
              disabled 
              className="bg-gray-100"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Enter your full name" 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Create a password" 
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500">Password must be at least 6 characters</p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full mt-6" 
            disabled={isSubmitting || !name || !password || password.length < 6}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account & Accept Invitation'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AcceptInvitation;
