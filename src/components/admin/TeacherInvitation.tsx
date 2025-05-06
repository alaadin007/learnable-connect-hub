import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { 
  isDataResponse, 
  isValidInvitation, 
  safelyExtractData,
  asSupabaseParam,
  createInsertData
} from "@/utils/supabaseHelpers";

interface TeacherInvite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const TeacherInvitation = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'invite' | 'create'>('invite');
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch teacher invitations on component mount
  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await supabase
        .from('teacher_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (isDataResponse(response)) {
        // Filter and map the data to ensure it matches the TeacherInvite interface
        const validInvites: TeacherInvite[] = response.data
          .filter(isValidInvitation)
          .map(item => ({
            id: item.id,
            email: item.email,
            status: item.status,
            created_at: item.created_at,
            expires_at: item.expires_at
          }));
        
        setInvites(validInvites);
      } else {
        console.error('Error fetching invitations:', response.error);
        toast.error('Failed to load teacher invitations');
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load teacher invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      if (inviteMethod === 'invite') {
        // Use database function directly to invite teacher
        const { data, error } = await supabase
          .rpc("invite_teacher", {
            teacher_email: email
          });

        if (error) throw error;
        
        toast.success(`Invitation sent to ${email}`);
        setEmail('');
        await fetchInvitations(); // Refresh the invitations list
      } else {
        // Handle direct account creation
        // First check if we have user school id
        const { data: schoolId, error: schoolIdError } = await supabase
          .rpc("get_user_school_id");

        if (schoolIdError || !schoolId) {
          toast.error("Could not determine your school");
          return;
        }

        // Generate a temporary password
        const tempPassword = generateTemporaryPassword();

        // Create the user account using supabase auth admin
        const { data, error } = await supabase.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || email.split('@')[0],
            user_type: 'teacher',
            school_id: schoolId
          }
        });

        if (error) throw error;

        // Show success with temp password
        toast.success(
          <div>
            <p>Account created for {email}</p>
            <p className="mt-2 font-mono text-xs">
              Temporary password: {tempPassword}
            </p>
          </div>,
          { duration: 10000 }
        );
        
        setEmail('');
        setFullName('');
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setInviting(false);
    }
  };

  // Helper function to generate a temporary password
  const generateTemporaryPassword = (length = 10): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
                The teacher's name will be pre-filled in their profile.
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
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              {inviteMethod === 'invite' ? 'Sending...' : 'Creating...'}
            </>
          ) : (
            inviteMethod === 'invite' ? 'Send Invitation' : 'Create Account'
          )}
        </Button>
      </CardFooter>

      <Separator className="my-4" />
      
      <CardHeader>
        <CardTitle>Teacher Invitations</CardTitle>
        <CardDescription>
          Pending and accepted teacher invitations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center py-4">Loading invitations...</p>
        ) : invites.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-1">Email</th>
                  <th className="text-left py-2 px-1">Sent</th>
                  <th className="text-left py-2 px-1">Expires</th>
                  <th className="text-left py-2 px-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-1">{invite.email}</td>
                    <td className="py-2 px-1">{formatDate(invite.created_at)}</td>
                    <td className="py-2 px-1">{formatDate(invite.expires_at)}</td>
                    <td className="py-2 px-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        invite.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : invite.status === "accepted"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground">No invitations found.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TeacherInvitation;
