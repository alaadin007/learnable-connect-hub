import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const AcceptInvitation = () => {
  const [processing, setProcessing] = useState(false);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const invitationToken = searchParams.get('token');

  useEffect(() => {
    if (!invitationToken) {
      toast.error("Invalid invitation link.");
      navigate('/login');
    }
  }, [invitationToken, navigate]);

  const acceptInvitation = async () => {
    setProcessing(true);
    try {
      // Call the function
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        body: { invitationToken, userId: user?.id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success("Invitation accepted successfully!");
        // Refresh the profile if available, otherwise redirect immediately
        if (refreshProfile) {
          await refreshProfile();
        }
        navigate('/dashboard');
      } else {
        throw new Error(data.message || "Failed to accept invitation");
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || "Error accepting invitation");
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>Accepting invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Accept Invitation</h2>
        <p className="mb-4">Click the button below to accept the invitation.</p>
        <Button onClick={acceptInvitation} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Accept
        </Button>
      </div>
    </div>
  );
};

export default AcceptInvitation;
