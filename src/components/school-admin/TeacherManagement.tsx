import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Mail, RefreshCw, Trash, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define the TeacherInvitation type explicitly
type TeacherInvitation = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "rejected";
  school_id: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  invitation_token: string;
};

const TeacherManagement = () => {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInvites, setIsFetchingInvites] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  
  // Safely access school info with optional chaining
  const schoolId = profile?.organization?.id || null;
  const schoolName = profile?.organization?.name || "Your school";
  
  useEffect(() => {
    if (schoolId) {
      fetchInvitations();
    }
  }, [schoolId]);

  const fetchInvitations = async () => {
    setIsFetchingInvites(true);
    try {
      // Try to fetch teacher invitations
      const { data, error } = await supabase
        .from("teacher_invitations")
        .select("*")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Convert data to typed invitations, ensuring status is one of the allowed values
      const typedInvitations = data.map(inv => ({
        ...inv,
        status: (inv.status === "pending" || inv.status === "accepted" || inv.status === "rejected") 
          ? inv.status as "pending" | "accepted" | "rejected"
          : "pending" // Default to pending if status is not valid
      })) as TeacherInvitation[];
      
      setInvitations(typedInvitations);
    } catch (error: any) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load teacher invitations", {
        id: "teacher-invitations-fetch-error"
      });
      
      // Try to get mock data instead
      try {
        await createMockInvitations();
        fetchInvitations(); // Try again after creating mock data
      } catch (mockError) {
        console.error("Error creating mock invitations:", mockError);
      }
    } finally {
      setIsFetchingInvites(false);
    }
  };

  // Function to create mock invitation data
  const createMockInvitations = async () => {
    if (!schoolId) return;
    
    try {
      // Check if invitations already exist
      const { data: existingInvites } = await supabase
        .from("teacher_invitations")
        .select("id")
        .eq("school_id", schoolId)
        .limit(1);
        
      // If no invitations exist, create mock data
      if (!existingInvites || existingInvites.length === 0) {
        const mockInvites = [
          {
            email: "teacher1@example.com",
            status: "pending",
            school_id: schoolId,
            invitation_token: "mock-token-1",
            created_by: profile?.id || "unknown",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          },
          {
            email: "teacher2@example.com",
            status: "accepted",
            school_id: schoolId,
            invitation_token: "mock-token-2",
            created_by: profile?.id || "unknown",
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          }
        ];
        
        const { error } = await supabase
          .from("teacher_invitations")
          .insert(mockInvites);
          
        if (error) throw error;
        
        console.log("Created mock teacher invitations");
      }
    } catch (error) {
      console.error("Error creating mock data:", error);
      throw error;
    }
  };

  const sendInvitation = async () => {
    if (!inviteEmail) return;
    
    setIsLoading(true);
    try {
      if (!profile?.organization?.id) {
        throw new Error("School information not available");
      }
      
      const { data, error } = await supabase.functions.invoke("invite-teacher", {
        body: { email: inviteEmail }
      });

      if (error) throw error;
      
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteDialogOpen(false);
      fetchInvitations();
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInvitation = async (id: string, email: string) => {
    try {
      if (!profile?.organization?.id) {
        throw new Error("School information not available");
      }
      
      const { error } = await supabase
        .from("teacher_invitations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Invitation to ${email} deleted`);
      fetchInvitations();
    } catch (error: any) {
      console.error("Error deleting invitation:", error);
      toast.error(error.message || "Failed to delete invitation");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Teacher Invitations</CardTitle>
            <CardDescription>
              Invite teachers to join {profile?.organization?.name || "your school"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchInvitations} disabled={isFetchingInvites}>
              <RefreshCw className={`h-4 w-4 ${isFetchingInvites ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gradient-bg" onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Teacher
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <div className="rounded-md border">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-medium">Email</th>
                    <th className="text-left py-2 px-4 font-medium hidden sm:table-cell">Sent</th>
                    <th className="text-left py-2 px-4 font-medium hidden md:table-cell">Expires</th>
                    <th className="text-left py-2 px-4 font-medium">Status</th>
                    <th className="text-right py-2 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((invite) => (
                    <tr key={invite.id} className="border-b">
                      <td className="py-2 px-4">{invite.email}</td>
                      <td className="py-2 px-4 hidden sm:table-cell">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4 hidden md:table-cell">
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4">
                        <span 
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${
                            invite.status === "pending" 
                              ? "bg-yellow-100 text-yellow-800" 
                              : invite.status === "accepted" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteInvitation(invite.id, invite.email)}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No teacher invitations yet.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Teacher invitations expire after 7 days. Teachers need to sign up using the same email the invitation was sent to.
          </p>
        </CardFooter>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a Teacher</DialogTitle>
            <DialogDescription>
              Send an email invitation to a teacher to join {schoolName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email"
                placeholder="teacher@school.edu" 
                type="email" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={sendInvitation} 
              disabled={isLoading || !inviteEmail}
              className="gradient-bg"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> 
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherManagement;
