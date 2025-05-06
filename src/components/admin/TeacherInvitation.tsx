
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Mail, Check, X, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";

const TeacherInvitation = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const fetchInvitations = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get school ID first
      const { data: schoolData, error: schoolError } = await supabase
        .rpc('get_user_school_id');
      
      if (schoolError || !schoolData) {
        console.error("Error fetching school ID:", schoolError);
        toast.error("Could not determine your school");
        setLoading(false);
        return;
      }
      
      // Get invitations
      const { data, error } = await supabase
        .from('teacher_invitations')
        .select('*')
        .eq('school_id', schoolData);
      
      if (error) {
        console.error("Error fetching invitations:", error);
        toast.error("Failed to load invitations");
        return;
      }
      
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error in fetchInvitations:", err);
      toast.error("An error occurred while fetching invitations");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchInvitations();
  }, [user]);
  
  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    setIsSending(true);
    try {
      const { data, error } = await supabase.rpc('invite_teacher', { 
        teacher_email: email 
      });
      
      if (error) {
        console.error("Error sending invitation:", error);
        toast.error(error.message || "Failed to send invitation");
      } else {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        // Refresh the invitations list
        fetchInvitations();
      }
    } catch (error: any) {
      console.error("Error in handleSendInvitation:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSending(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite Teachers</CardTitle>
          <CardDescription>
            Send invitations to teachers to join your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="email" className="text-sm font-medium mb-2 block">
                Teacher Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@school.edu"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Track the status of teacher invitations
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchInvitations} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : invitations.length > 0 ? (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="border rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-sm">{invitation.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${
                        invitation.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invitation.status === 'pending' ? (
                          <>Pending</>
                        ) : invitation.status === 'accepted' ? (
                          <><Check className="h-3 w-3 mr-1" /> Accepted</>
                        ) : (
                          <><X className="h-3 w-3 mr-1" /> Expired</>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Sent: {formatDate(invitation.created_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Expires: {formatDate(invitation.expires_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTitle>No pending invitations</AlertTitle>
              <AlertDescription>
                When you invite teachers, they will appear here.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherInvitation;
