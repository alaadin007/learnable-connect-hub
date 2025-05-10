
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AcceptInvitation = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const acceptInvitation = async () => {
      setLoading(true);
      setError(null);

      if (!token) {
        setError('Invalid invitation token');
        setLoading(false);
        return;
      }

      try {
        // Get token info first
        const { data: inviteInfo, error: verifyError } = await supabase.rpc(
          'verify_teacher_invitation',
          { token }
        );

        if (verifyError || !inviteInfo) {
          throw new Error(verifyError?.message || 'Invalid or expired invitation');
        }

        // Accept the invitation
        const { error: acceptError } = await supabase.rpc(
          'accept_teacher_invitation',
          { token }
        );

        if (acceptError) {
          throw new Error(acceptError.message);
        }

        // Refresh the user profile to get updated role
        if (refreshProfile) {
          await refreshProfile();
        }

        toast.success('Invitation accepted!', {
          description: `You have successfully joined ${inviteInfo.school_name} as a teacher.`
        });
        
        // Navigate to the teacher dashboard
        setTimeout(() => {
          navigate('/teacher/dashboard');
        }, 2000);

      } catch (error: any) {
        console.error('Error accepting invitation:', error);
        setError(error.message || 'Failed to accept invitation');
        toast.error('Error accepting invitation', {
          description: error.message
        });
      } finally {
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 text-learnable-blue animate-spin" />
          <h2 className="mt-4 text-xl font-semibold">Processing Invitation</h2>
          <p className="mt-2 text-gray-600">Please wait while we accept your invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="p-6 bg-white shadow-lg rounded-lg max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600">Invitation Error</h2>
          <p className="mt-4 text-gray-700">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full py-2 px-4 bg-learnable-blue hover:bg-learnable-blue-dark text-white font-medium rounded transition duration-150"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="p-6 bg-white shadow-lg rounded-lg max-w-md w-full text-center">
        <h2 className="text-xl font-bold text-learnable-blue">Invitation Accepted!</h2>
        <p className="mt-4 text-gray-700">
          Your invitation has been successfully accepted. You're now being redirected to your dashboard.
        </p>
      </div>
    </div>
  );
};

export default AcceptInvitation;
