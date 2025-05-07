
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Mail, UserPlus } from "lucide-react";

// Define the schema for teacher form
const addTeacherSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  method: z.enum(["invite", "create"], {
    required_error: "Please select a method",
  }),
  full_name: z.string().optional(),
});

type AddTeacherFormValues = z.infer<typeof addTeacherSchema>;

type TeacherInvite = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: string;
};

const AdminTeachers = () => {
  const { user, profile, isSupervisor } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [invites, setInvites] = useState<TeacherInvite[]>([]);

  const form = useForm<AddTeacherFormValues>({
    resolver: zodResolver(addTeacherSchema),
    defaultValues: {
      email: "",
      method: "invite",
      full_name: "",
    },
  });
  
  const selectedMethod = form.watch("method");

  // Load teacher invites
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const { data, error } = await supabase
          .from("teacher_invites")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setInvites(data || []);
      } catch (error: any) {
        console.error("Error fetching teacher invites:", error);
        toast.error("Failed to load teacher invites");
      }
    };

    fetchInvites();
  }, []);

  const onSubmit = async (values: AddTeacherFormValues) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      if (values.method === "invite") {
        // Call the invite-teacher edge function
        const { data, error } = await supabase.functions.invoke("invite-teacher", {
          body: { email: values.email }
        });

        if (error) throw new Error(error.message);
        
        toast.success(`Invitation sent to ${values.email}`);
      } else {
        // Call the create-teacher edge function
        const { data, error } = await supabase.functions.invoke("create-teacher", {
          body: { 
            email: values.email,
            full_name: values.full_name || undefined
          }
        });

        if (error) throw new Error(error.message);
        
        // Show success message with temporary password
        toast.success(
          <div>
            <p>Teacher account created for {values.email}</p>
            <p className="mt-2 font-mono text-xs">
              Temporary password: {data.temp_password}
            </p>
          </div>,
          { duration: 10000 }
        );
      }
      
      form.reset();
      
      // Refresh the invites list
      const { data: updatedInvites } = await supabase
        .from("teacher_invites")
        .select("*")
        .order("created_at", { ascending: false });

      if (updatedInvites) {
        setInvites(updatedInvites);
      }
      
    } catch (error: any) {
      console.error("Error adding teacher:", error);
      toast.error(error.message || "Failed to add teacher");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Teacher Management</h1>
            <p className="text-learnable-gray">
              Add or invite teachers to join your school
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Add New Teacher</CardTitle>
              <CardDescription>
                Invite a teacher via email or create an account directly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="teacher@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="invite" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Invite via Email
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="create" />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Create Account Directly
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormDescription>
                          {selectedMethod === "invite" 
                            ? "The teacher will receive an email invitation to join your school." 
                            : "You will create the account directly and get a temporary password."}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {selectedMethod === "create" && (
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormDescription>
                            The teacher's name will be pre-filled in their profile.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <Button 
                    type="submit" 
                    className="gradient-bg" 
                    disabled={isLoading}
                  >
                    {selectedMethod === "invite" ? (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        {isLoading ? "Sending..." : "Send Invitation"}
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        {isLoading ? "Creating..." : "Create Teacher Account"}
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Teacher Invitations</CardTitle>
              <CardDescription>
                Pending and accepted teacher invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invites.length > 0 ? (
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
                          <td className="py-2 px-1">
                            {new Date(invite.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-1">
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </td>
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
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                Teacher invitations expire after 7 days. Teachers need to sign up using the same email the invitation was sent to.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeachers;
