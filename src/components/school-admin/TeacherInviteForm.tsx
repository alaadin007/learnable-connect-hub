
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface TeacherInviteFormProps {
  onTeacherInvited?: () => void;
}

const TeacherInviteForm = ({ onTeacherInvited }: TeacherInviteFormProps) => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { profile } = useAuth();

  const handleInviteTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    if (!profile?.school_id) {
      toast.error('Cannot determine your school. Please try again or contact support.');
      return;
    }

    setIsSending(true);
    
    try {
      // Call the RPC function to invite a teacher
      const { data, error } = await supabase.rpc(
        'invite_teacher', 
        { 
          email_param: email,
          school_id_param: profile.school_id
        }
      );
      
      if (error) throw error;
      
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      
      // Call the callback if provided
      if (onTeacherInvited) {
        onTeacherInvited();
      }
      
    } catch (error: any) {
      console.error('Error inviting teacher:', error);
      toast.error(error.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a Teacher</CardTitle>
      </CardHeader>
      <form onSubmit={handleInviteTeacher}>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="teacher@school.edu"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSending} className="w-full">
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              'Send Invitation'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default TeacherInviteForm;
