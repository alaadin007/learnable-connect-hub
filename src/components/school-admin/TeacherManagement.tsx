
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, UserPlus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { TeacherInvitation } from "@/utils/supabaseHelpers";

const formSchema = z.object({
  email: z.string().email(),
  method: z.enum(["invite", "create"]),
  full_name: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TeacherManagement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshingInvites, setIsRefreshingInvites] = useState(false);
  const [invitations, setInvitations] = useState<TeacherInvitation[]>([]);
  const { profile } = useAuth();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      method: "invite",
      full_name: "",
    },
  });
  
  const selectedMethod = form.watch("method");
  
  useEffect(() => {
    fetchInvitations();
  }, []);
  
  const fetchInvitations = async () => {
    try {
      setIsRefreshingInvites(true);
      const { data, error } = await supabase
        .from("teacher_invitations")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      // Type cast the data to ensure it matches TeacherInvitation[]
      if (data) {
        const typedData: TeacherInvitation[] = data.map((item: any) => ({
          id: item.id,
          school_id: item.school_id,
          email: item.email,
          status: item.status,
          invitation_token: item.invitation_token,
          created_by: item.created_by,
          created_at: item.created_at,
          expires_at: item.expires_at,
          role: item.role
        }));
        
        setInvitations(typedData);
      }
    } catch (err: any) {
      console.error("Error fetching invitations:", err);
      toast.error("Failed to load teacher invitations");
    } finally {
      setIsRefreshingInvites(false);
    }
  };
  
  const onSubmit = async (formValues: FormValues) => {
    if (!profile?.school_id) {
      toast.error("School information is missing");
      return;
    }
    
    setIsLoading(true);
    try {
      if (formValues.method === "invite") {
        // Send invitation via edge function
        const { data, error } = await supabase.functions.invoke("invite-teacher", {
          body: { email: formValues.email }
        });
        
        if (error) throw error;
        toast.success(`Invitation sent to ${formValues.email}`);
      } else {
        // Create teacher account directly via edge function
        const { data, error } = await supabase.functions.invoke("create-teacher", {
          body: {
            email: formValues.email,
            full_name: formValues.full_name || undefined
          }
        });
        
        if (error) throw error;
        
        toast.success(
          <div>
            <p>Teacher account created for {formValues.email}</p>
            {data?.temp_password && (
              <p className="mt-2 font-mono text-xs">
                Temporary password: {data.temp_password}
              </p>
            )}
          </div>,
          { duration: 10000 }
        );
      }
      
      form.reset();
      fetchInvitations();
      
    } catch (err: any) {
      console.error("Error adding teacher:", err);
      toast.error(err.message || "Failed to add teacher");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Teacher</CardTitle>
        <CardDescription>
          Invite a teacher via email or create an account directly
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
                <FormItem className="space-y-2">
                  <FormLabel>Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-2"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="invite" />
                        </FormControl>
                        <FormLabel className="font-normal">Invite via Email</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <RadioGroupItem value="create" />
                        </FormControl>
                        <FormLabel className="font-normal">Create Account Directly</FormLabel>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                "Submitting..."
              ) : selectedMethod === "invite" ? (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Teacher Account
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TeacherManagement;
