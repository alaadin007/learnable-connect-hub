import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Check, X, Mail, UserPlus } from "lucide-react";

// Define the schema for teacher invitation form
const inviteTeacherSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

// Define types for our component
type InviteTeacherFormValues = z.infer<typeof inviteTeacherSchema>;
type TeacherInvitation = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: string;
};

type Teacher = {
  id: string;
  is_supervisor: boolean;
  full_name: string | null;
  email: string;
};

const TeacherManagement = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const form = useForm<InviteTeacherFormValues>({
    resolver: zodResolver(inviteTeacherSchema),
    defaultValues: {
      email: "",
    },
  });

  // Load invitations and teachers
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        // Fetch invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from("teacher_invitations")
          .select("id, email, created_at, expires_at, status")
          .order("created_at", { ascending: false });

        if (invitationsError) throw invitationsError;
        setInvitations(invitationsData || []);

        // Fetch teachers - fix the query to properly join with profiles
        const { data: teachersData, error: teachersError } = await supabase
          .from("teachers")
          .select(`
            id, 
            is_supervisor,
            profiles:id(full_name)
          `)
          .order("is_supervisor", { ascending: false });

        if (teachersError) throw teachersError;

        // Get emails for the teachers
        const teachersWithProfiles = await Promise.all((teachersData || []).map(async (teacher) => {
          // This is a simplification - in production, use a secure RPC to get emails
          const { data: profileData } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("id", teacher.id)
            .single();

          return {
            id: teacher.id,
            is_supervisor: teacher.is_supervisor,
            full_name: profileData?.full_name || null,
            email: profileData?.email || teacher.id || 'Unknown',
          };
        }));

        setTeachers(teachersWithProfiles);
      } catch (error: any) {
        console.error("Error fetching teacher data:", error);
        toast.error("Failed to load teacher data");
      }
    };

    fetchTeacherData();
  }, []);

  const onSubmit = async (values: InviteTeacherFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Call the RPC function to create an invitation
      const { data, error } = await supabase.rpc("invite_teacher", {
        teacher_email: values.email,
      });

      if (error) throw error;

      toast.success(`Invitation sent to ${values.email}`);
      form.reset();

      // Refresh the invitations list
      const { data: updatedInvitations } = await supabase
        .from("teacher_invitations")
        .select("id, email, created_at, expires_at, status")
        .order("created_at", { ascending: false });

      if (updatedInvitations) {
        setInvitations(updatedInvitations);
      }
    } catch (error: any) {
      console.error("Error inviting teacher:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite New Teacher</CardTitle>
          <CardDescription>
            Send an invitation to a teacher to join your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="flex space-x-2">
                        <Input placeholder="teacher@example.com" {...field} className="flex-1" />
                        <Button type="submit" className="gradient-bg" disabled={isLoading}>
                          <Mail className="mr-2 h-4 w-4" />
                          {isLoading ? "Sending..." : "Send Invitation"}
                        </Button>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Enter the teacher's email address to send them an invitation.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Teachers</CardTitle>
          <CardDescription>Teachers at your school</CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1">Name</th>
                    <th className="text-left py-2 px-1">Email</th>
                    <th className="text-left py-2 px-1">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr key={teacher.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-1">{teacher.full_name || "Not provided"}</td>
                      <td className="py-2 px-1">{teacher.email}</td>
                      <td className="py-2 px-1">
                        {teacher.is_supervisor ? (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                            Supervisor
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                            Teacher
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">No teachers found.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Teacher invitations that have been sent</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
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
                  {invitations.map((invitation) => (
                    <tr key={invitation.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-1">{invitation.email}</td>
                      <td className="py-2 px-1">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-1">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-1">
                        {invitation.status === "pending" ? (
                          <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                            Pending
                          </span>
                        ) : invitation.status === "accepted" ? (
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Accepted
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded flex items-center">
                            <X className="h-3 w-3 mr-1" />
                            Expired
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground">No pending invitations found.</p>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Teacher invitations expire after 7 days. They will need to sign up using the same email the invitation was sent to.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TeacherManagement;
