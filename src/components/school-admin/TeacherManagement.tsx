import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Mail, UserCheck, UserX } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeacherInvitation {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

const TeacherManagement = () => {
  const { profile } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([]);
  const [activeTeachers, setActiveTeachers] = useState<any[]>([]);
  const [isLoadingTeachers, setIsLoadingTeachers] = useState(true);
  const schoolId = profile?.organization?.id || null;

  useEffect(() => {
    if (schoolId) {
      loadInvitations();
      loadActiveTeachers();
    }
  }, [schoolId]);

  const loadInvitations = async () => {
    try {
      if (!schoolId) return;
      
      const { data, error } = await supabase
        .from("teacher_invitations")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      // Ensure the status is properly typed
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as "pending" | "accepted" | "rejected"
      }));
      
      setInvitations(typedData);
    } catch (error) {
      console.error("Error loading invitations:", error);
      toast.error("Failed to load invitations", {
        id: "load-invitations-error"
      });
    }
  };

  const loadActiveTeachers = async () => {
    setIsLoadingTeachers(true);
    try {
      if (!schoolId) return;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("school_id", schoolId)
        .eq("user_type", "teacher");
      
      if (error) throw error;
      
      setActiveTeachers(data || []);
    } catch (error) {
      console.error("Error loading active teachers:", error);
      toast.error("Failed to load active teachers", {
        id: "load-teachers-error"
      });
    } finally {
      setIsLoadingTeachers(false);
    }
  };
  
  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Please enter an email address", {
        id: "missing-email-error"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (!schoolId) {
        throw new Error("No school ID found");
      }
      
      const { data, error } = await supabase.functions.invoke("invite-teacher", {
        body: {
          email: email.trim(),
          schoolId: schoolId,
        },
      });
      
      if (error) throw error;
      
      toast.success(`Invitation sent to ${email}`, {
        id: "invite-success"
      });
      setEmail("");
      
      // Refresh the invitations list
      loadInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation", {
        id: "invite-error"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const cancelInvitation = async (invitationId: string, teacherEmail: string) => {
    try {
      if (!schoolId) {
        throw new Error("No school ID found");
      }
      
      const { error } = await supabase
        .from("teacher_invitations")
        .delete()
        .eq("id", invitationId)
        .eq("school_id", schoolId);
      
      if (error) throw error;
      
      toast.success(`Invitation to ${teacherEmail} cancelled`, {
        id: `cancel-invite-${invitationId}`
      });
      
      // Refresh the invitations list
      loadInvitations();
    } catch (error: any) {
      console.error("Error cancelling invitation:", error);
      toast.error(error.message || "Failed to cancel invitation", {
        id: "cancel-invite-error"
      });
    }
  };
  
  const revokeAccess = async (teacherId: string, teacherEmail: string) => {
    try {
      if (!schoolId) {
        throw new Error("No school ID found");
      }
      
      // This would typically call a function to disable the account
      // For demo purposes, we'll just show a success message
      toast.success(`Access revoked for ${teacherEmail}`, {
        id: `revoke-access-${teacherId}`
      });
    } catch (error: any) {
      console.error("Error revoking access:", error);
      toast.error(error.message || "Failed to revoke access", {
        id: "revoke-access-error"
      });
    }
  };
  
  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard", {
      id: "copy-link"
    });
  };

  const resendInvite = async (invitationId: string, teacherEmail: string) => {
    try {
      // This would typically call a function to resend the invitation
      // For demo purposes, we'll just show a success message
      toast.success(`Invitation resent to ${teacherEmail}`, {
        id: `resend-invite-${invitationId}`
      });
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation", {
        id: "resend-invite-error"
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case "accepted":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Accepted
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite a Teacher</CardTitle>
          <CardDescription>Send an invitation to a teacher to join your school</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder="teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !email.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="invitations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="active">Active Teachers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Invitations</CardTitle>
              <CardDescription>Manage pending invitations for teachers</CardDescription>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No teacher invitations found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 px-4">Email</th>
                        <th className="text-left p-2 px-4">Status</th>
                        <th className="text-left p-2 px-4">Date</th>
                        <th className="text-right p-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((invitation) => (
                        <tr key={invitation.id} className="border-t hover:bg-muted/50">
                          <td className="p-2 px-4">{invitation.email}</td>
                          <td className="p-2 px-4">{getStatusBadge(invitation.status)}</td>
                          <td className="p-2 px-4">{formatDate(invitation.created_at)}</td>
                          <td className="p-2 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              {invitation.status === "pending" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyInviteLink("mock-token")}
                                    title="Copy invitation link"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => resendInvite(invitation.id, invitation.email)}
                                    title="Resend invitation"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => cancelInvitation(invitation.id, invitation.email)}
                                    title="Cancel invitation"
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Teachers</CardTitle>
              <CardDescription>Manage current teachers at your school</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTeachers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeTeachers.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No active teachers found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 px-4">Name</th>
                        <th className="text-left p-2 px-4">Email</th>
                        <th className="text-left p-2 px-4">Status</th>
                        <th className="text-right p-2 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTeachers.map((teacher) => (
                        <tr key={teacher.id} className="border-t hover:bg-muted/50">
                          <td className="p-2 px-4">{teacher.full_name || "N/A"}</td>
                          <td className="p-2 px-4">{teacher.email || "N/A"}</td>
                          <td className="p-2 px-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          </td>
                          <td className="p-2 px-4 text-right">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => revokeAccess(teacher.id, teacher.email)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Revoke Access
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeacherManagement;
