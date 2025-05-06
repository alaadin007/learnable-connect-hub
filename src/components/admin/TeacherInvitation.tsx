
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface TeacherInvite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const TeacherInvitation = () => {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const response = await supabase
        .from('teacher_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      const validInvites: TeacherInvite[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach(item => {
          if (
            item && 
            typeof item === 'object' &&
            'id' in item && 
            'email' in item && 
            'status' in item && 
            'created_at' in item && 
            'expires_at' in item
          ) {
            validInvites.push({
              id: String(item.id || ''),
              email: String(item.email || ''),
              status: String(item.status || ''),
              created_at: String(item.created_at || ''),
              expires_at: String(item.expires_at || '')
            });
          }
        });
        
        setInvites(validInvites);
      } else if (response.error) {
        console.error('Error fetching invitations:', response.error);
        toast.error('Failed to load teacher invitations');
      }
    } catch (error) {
      console.error('Error in fetchInvitations:', error);
      toast.error('Failed to load teacher invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      setIsSending(false);
      return;
    }

    try {
      // Call the invite_teacher function
      const { data, error } = await supabase.rpc(
        'invite_teacher', 
        { teacher_email: email }
      );

      if (error) {
        console.error('Error sending invitation:', error);
        toast.error(error.message || 'Failed to send invitation');
        setIsSending(false);
        return;
      }

      // Refresh the invitations list
      await fetchInvitations();
      toast.success('Invitation sent successfully');
      setEmail('');
    } catch (error: any) {
      console.error('Error in handleSendInvitation:', error);
      toast.error(error.message || 'An error occurred while sending the invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (inviteId: string, inviteEmail: string) => {
    setIsSending(true);
    try {
      // Call the invite_teacher function again with the same email
      const { data, error } = await supabase.rpc(
        'invite_teacher', 
        { teacher_email: inviteEmail }
      );

      if (error) {
        console.error('Error resending invitation:', error);
        toast.error('Failed to resend invitation');
        return;
      }

      await fetchInvitations();
      toast.success('Invitation resent successfully');
    } catch (error) {
      console.error('Error in handleResend:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('teacher_invitations')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) {
        console.error('Error cancelling invitation:', error);
        toast.error('Failed to cancel invitation');
        return;
      }

      await fetchInvitations();
      toast.success('Invitation cancelled');
    } catch (error) {
      console.error('Error in handleCancel:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Invite Teacher</CardTitle>
        <CardDescription>Send an invitation to a teacher to join your school</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                placeholder="teacher@school.edu"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                required
              />
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending
                  </>
                ) : (
                  'Invite'
                )}
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-6">
          <h3 className="text-lg font-medium">Recent Invitations</h3>
          {isLoading ? (
            <div className="flex justify-center my-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invites.length > 0 ? (
            <div className="mt-2 space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="border rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className="font-medium">{invite.status}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent: {formatDate(invite.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {formatDate(invite.expires_at)}
                      </p>
                    </div>
                    {invite.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResend(invite.id, invite.email)}
                          disabled={isSending}
                        >
                          Resend
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCancel(invite.id)}
                          disabled={isSending}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground my-4">No invitations sent yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherInvitation;
