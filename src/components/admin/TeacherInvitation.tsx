
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { inviteTeacherDirect } from '@/utils/databaseUtils';

const TeacherInvitation = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'invite' | 'create'>('invite');

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      if (inviteMethod === 'invite') {
        const result = await inviteTeacherDirect(email);
        
        if (result.success) {
          toast.success(`Invitation sent to ${email}`);
          setEmail('');
        } else {
          toast.error(result.message || "Failed to send invitation");
        }
      } else {
        // For direct creation, we would normally use an edge function
        // Since we're replacing edge functions, show a notification
        toast.error("Direct teacher creation requires server-side privileges");
      }
    } catch (error) {
      console.error("Error inviting teacher:", error);
      toast.error("An error occurred while sending the invitation");
    } finally {
      setInviting(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Add New Teacher</CardTitle>
        <CardDescription>
          Invite a teacher to join your school or create an account directly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={inviteMethod === 'invite' ? 'default' : 'outline'}
              onClick={() => setInviteMethod('invite')}
            >
              Send Invitation
            </Button>
            <Button
              type="button"
              variant={inviteMethod === 'create' ? 'default' : 'outline'}
              onClick={() => setInviteMethod('create')}
            >
              Create Account
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="teacher@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {inviteMethod === 'create' && (
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">
                Full Name
              </label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Note: Creating teacher accounts directly is unavailable without server-side privileges.
              </p>
            </div>
          )}

          {inviteMethod === 'invite' && (
            <div className="text-sm text-muted-foreground">
              <p>An invitation link will be sent to the teacher's email address.</p>
              <p>They will need to create an account and accept the invitation.</p>
            </div>
          )}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => {
          setEmail('');
          setFullName('');
        }}>
          Clear
        </Button>
        <Button 
          onClick={handleInvite} 
          disabled={!email || inviting}
        >
          {inviting ? (
            <>
              <span className="animate-spin mr-2">⟳</span> 
              {inviteMethod === 'invite' ? 'Sending...' : 'Creating...'}
            </>
          ) : (
            inviteMethod === 'invite' ? 'Send Invitation' : 'Create Account'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TeacherInvitation;
