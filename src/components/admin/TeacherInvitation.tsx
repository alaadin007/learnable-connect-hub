
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { asSupabaseParam, isValidSupabaseData } from "@/utils/supabaseHelpers";

interface TeacherInvite {
  id: string;
  email: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const TeacherInvitation: React.FC = () => {
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteMethod, setInviteMethod] = useState<"invite" | "create">("invite");
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await supabase
        .from("teacher_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      if (response.error) {
        console.error("Error fetching invitations:", response.error);
        toast.error("Failed to load teacher invitations");
        setInvites([]);
        return;
      }

      const data = response.data;

      if (Array.isArray(data)) {
        const validInvites: TeacherInvite[] = data.map((item) => {
          if (item) {
            return {
              id: String(item.id || ""),
              email: String(item.email || ""),
              status: String(item.status || "pending"),
              created_at: String(item.created_at || new Date().toISOString()),
              expires_at: String(item.expires_at || new Date().toISOString()),
            };
          }
          return {
            id: "",
            email: "",
            status: "unknown",
            created_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
          };
        }).filter(invite => invite.id !== "");
        
        setInvites(validInvites);
      } else {
        setInvites([]);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load teacher invitations");
      setInvites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setInviting(true);
    try {
      if (inviteMethod === "invite") {
        const { error } = await supabase.rpc("invite_teacher", {
          teacher_email: email.trim(),
        });

        if (error) throw error;

        toast.success(`Invitation sent to ${email.trim()}`);
        setEmail("");
        await fetchInvitations();
      } else {
        const { data: schoolId, error: schoolIdError } = await supabase.rpc(
          "get_user_school_id"
        );

        if (schoolIdError || !schoolId) {
          toast.error("Could not determine your school");
          return;
        }

        const tempPassword = generateTemporaryPassword();

        // Note: supabase.auth.admin.createUser requires service_role key; make sure environment supports this
        const { error } = await supabase.auth.admin.createUser({
          email: email.trim(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || email.trim().split("@")[0],
            user_type: "teacher",
            school_id: schoolId,
          },
        });

        if (error) throw error;

        toast.success(
          <div>
            <p>Account created for {email.trim()}</p>
            <p className="mt-2 font-mono text-xs">
              Temporary password: {tempPassword}
            </p>
          </div>,
          { duration: 10000 }
        );

        setEmail("");
        setFullName("");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "An error occurred");
    } finally {
      setInviting(false);
    }
  };

  const generateTemporaryPassword = (length = 10) => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString();

  const handleResendInvitation = async (inviteId: string) => {
    try {
      // First update the status back to pending and reset expiration date
      const newExpiryDate = new Date();
      newExpiryDate.setDate(newExpiryDate.getDate() + 7); // 7 days from now
      
      await supabase
        .from("teacher_invitations")
        .update(asSupabaseParam({
          status: "pending",
          expires_at: newExpiryDate.toISOString()
        }))
        .eq("id", inviteId);
      
      toast.success("Invitation resent successfully");
      await fetchInvitations();
    } catch (error: any) {
      console.error("Error resending invitation:", error);
      toast.error(error.message || "Failed to resend invitation");
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
              variant={inviteMethod === "invite" ? "default" : "outline"}
              onClick={() => setInviteMethod("invite")}
            >
              Send Invitation
            </Button>
            <Button
              type="button"
              variant={inviteMethod === "create" ? "default" : "outline"}
              onClick={() => setInviteMethod("create")}
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

          {inviteMethod === "create" && (
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

          {inviteMethod === "invite" && (
            <p className="text-sm text-muted-foreground">
              An invitation link will be sent to the teacher's email address.
              They will need to create an account and accept the invitation.
            </p>
          )}
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex justify-between pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setEmail("");
            setFullName("");
          }}
        >
          Clear
        </Button>
        <Button onClick={handleInvite} disabled={!email.trim() || inviting}>
          {inviting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {inviteMethod === "invite" ? "Sending..." : "Creating..."}
            </>
          ) : inviteMethod === "invite" ? (
            "Send Invitation"
          ) : (
            "Create Account"
          )}
        </Button>
      </CardFooter>

      <Separator className="my-4" />

      <CardHeader>
        <CardTitle>Teacher Invitations</CardTitle>
        <CardDescription>Pending and accepted teacher invitations</CardDescription>
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
                  <th className="text-left py-2 px-1">Action</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-1">{invite.email}</td>
                    <td className="py-2 px-1">{formatDate(invite.created_at)}</td>
                    <td className="py-2 px-1">{formatDate(invite.expires_at)}</td>
                    <td className="py-2 px-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
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
                    <td className="py-2 px-1">
                      {invite.status === "pending" && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResendInvitation(invite.id)}
                        >
                          Resend
                        </Button>
                      )}
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
