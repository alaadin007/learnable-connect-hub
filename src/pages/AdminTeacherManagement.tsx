
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, UserPlus, CheckCircle, XCircle, Clock } from "lucide-react";

// Define schemas for our forms
const inviteTeacherSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  method: z.enum(["invite", "create"], {
    required_error: "Please select a method",
  }),
  full_name: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof inviteTeacherSchema>;

type Teacher = {
  id: string;
  full_name: string | null;
  email: string;
  is_supervisor: boolean;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  created_at: string;
  expires_at: string;
  status: string;
};

const AdminTeacherManagement = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  const form = useForm<TeacherFormValues>({
    resolver: zodResolver(inviteTeacherSchema),
    defaultValues: {
      email: "",
      method: "invite",
    },
  });
  
  const selectedMethod = form.watch("method");
  
  // Load teachers and invitations
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        // Fetch teachers
        const { data: teachersData, error: teachersError } = await supabase
          .from("teachers")
          .select(`
            id, 
            is_supervisor,
            profiles!inner(
              full_name,
              created_at
            )
          `)
          .eq("school_id", profile?.school_id);
          
        if (teachersError) throw teachersError;
        
        // Format teacher data
        const formattedTeachers = teachersData?.map(teacher => ({
          id: teacher.id,
          full_name: teacher.profiles?.full_name || null,
          email: teacher.id, // Using ID as email placeholder
          is_supervisor: teacher.is_supervisor,
          created_at: teacher.profiles?.created_at,
        })) || [];
        
        setTeachers(formattedTeachers);
        
        // Fetch invitations
        const { data: invitesData, error: invitesError } = await supabase
          .from("teacher_invitations")
          .select("id, email, created_at, expires_at, status")
          .order("created_at", { ascending: false });
          
        if (invitesError) throw invitesError;
        setInvitations(invitesData || []);
        
      } catch (error: any) {
        console.error("Error fetching teacher data:", error);
        toast.error("Failed to load teacher data");
      }
    };
    
    if (profile?.school_id) {
      fetchTeacherData();
    }
  }, [profile?.school_id]);
  
  const onSubmit = async (values: TeacherFormValues) => {
    setIsLoading(true);
    
    try {
      if (values.method === "invite") {
        // Send invitation via edge function
        const { data, error } = await supabase.functions.invoke("invite-teacher", {
          body: { email: values.email }
        });
        
        if (error) throw new Error(error.message);
        
        toast.success(`Invitation sent to ${values.email}`);
      } else {
        // Create teacher account directly via edge function
        const { data, error } = await supabase.functions.invoke("create-teacher", {
          body: { 
            email: values.email,
            full_name: values.full_name 
          }
        });
        
        if (error) throw new Error(error.message);
        
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
      
      // Reset form
      form.reset();
      
      // Refresh data
      const { data: updatedInvites } = await supabase
        .from("teacher_invitations")
        .select("id, email, created_at, expires_at, status")
        .order("created_at", { ascending: false });
        
      if (updatedInvites) {
        setInvitations(updatedInvites);
      }
      
      // Also refresh teachers if we created an account directly
      if (values.method === "create") {
        const { data: teachersData } = await supabase
          .from("teachers")
          .select(`
            id, 
            is_supervisor,
            profiles!inner(
              full_name,
              created_at
            )
          `)
          .eq("school_id", profile?.school_id);
          
        if (teachersData) {
          const formattedTeachers = teachersData.map(teacher => ({
            id: teacher.id,
            full_name: teacher.profiles?.full_name || null,
            email: teacher.id,
            is_supervisor: teacher.is_supervisor,
            created_at: teacher.profiles?.created_at,
          }));
          
          setTeachers(formattedTeachers);
        }
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
          
          <Tabs defaultValue="add" className="space-y-6">
            <TabsList>
              <TabsTrigger value="add">Add Teachers</TabsTrigger>
              <TabsTrigger value="current">Current Teachers</TabsTrigger>
              <TabsTrigger value="invitations">Pending Invitations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="add">
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
                                <Input placeholder="Jane Doe" {...field} value={field.value || ""} />
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
            </TabsContent>
            
            <TabsContent value="current">
              <Card>
                <CardHeader>
                  <CardTitle>Current Teachers</CardTitle>
                  <CardDescription>Teachers at your school</CardDescription>
                </CardHeader>
                <CardContent>
                  {teachers.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email/ID</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teachers.map((teacher) => (
                            <TableRow key={teacher.id}>
                              <TableCell className="font-medium">{teacher.full_name || "Not provided"}</TableCell>
                              <TableCell>{teacher.email}</TableCell>
                              <TableCell>
                                {teacher.is_supervisor ? (
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                                    Administrator
                                  </span>
                                ) : (
                                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                    Teacher
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{new Date(teacher.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No teachers found for your school.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="invitations">
              <Card>
                <CardHeader>
                  <CardTitle>Teacher Invitations</CardTitle>
                  <CardDescription>Pending and completed invitations</CardDescription>
                </CardHeader>
                <CardContent>
                  {invitations.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Sent</TableHead>
                            <TableHead>Expires</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.map((invite) => (
                            <TableRow key={invite.id}>
                              <TableCell className="font-medium">{invite.email}</TableCell>
                              <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(invite.expires_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                {invite.status === "pending" ? (
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-1 text-yellow-500" />
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
                                      Pending
                                    </span>
                                  </div>
                                ) : invite.status === "accepted" ? (
                                  <div className="flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                                      Accepted
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    <XCircle className="h-4 w-4 mr-1 text-red-500" />
                                    <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded">
                                      Expired
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No invitations have been sent yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminTeacherManagement;
