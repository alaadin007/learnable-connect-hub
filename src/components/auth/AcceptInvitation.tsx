import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Define the typed interface for invitation details
interface InvitationDetails {
  invitation_id?: string;
  school_id?: string;
  school_name?: string;
  email?: string;
}

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails>({});
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    // Verify the invitation token
    async function verifyToken() {
      if (!token) {
        setError("Invalid invitation link");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('verify_teacher_invitation', {
          token
        });

        if (error) {
          throw error;
        }

        if (data) {
          setInvitationDetails(data as InvitationDetails);
        } else {
          setError("Invalid or expired invitation");
        }
      } catch (err: any) {
        setError(err.message || "Failed to verify invitation");
      } finally {
        setLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!user) {
      // If not logged in, redirect to login first
      navigate(`/login?invitation=${token}`);
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc('accept_teacher_invitation', {
        token,
        user_id: user.id
      });

      if (error) throw error;
      
      setAccepted(true);
      toast.success(`You've joined ${invitationDetails.school_name} as a teacher`);
      
      // Refresh user profile to get updated roles
      await refreshProfile();
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err: any) {
      toast.error(err.message || "Failed to accept invitation");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-learnable-purple" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-500">Invitation Error</CardTitle>
            <CardDescription>There was a problem with your invitation</CardDescription>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle>Invitation Accepted!</CardTitle>
            <CardDescription>You are now a teacher at {invitationDetails.school_name}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Teacher Invitation</CardTitle>
          <CardDescription>Join {invitationDetails.school_name} as a teacher</CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            You've been invited to join <strong>{invitationDetails.school_name}</strong> as a teacher
            using the email <strong>{invitationDetails.email}</strong>.
          </p>
          {user && user.email !== invitationDetails.email && (
            <p className="mt-4 text-amber-600">
              Note: You are currently logged in as {user.email}, but this invitation was sent to {invitationDetails.email}.
              You may need to log out and sign in with the correct account.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {user ? (
            <Button 
              onClick={handleAcceptInvitation} 
              disabled={verifying}
              className="gradient-bg"
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleAcceptInvitation}
              className="gradient-bg"
            >
              Sign In to Accept
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
