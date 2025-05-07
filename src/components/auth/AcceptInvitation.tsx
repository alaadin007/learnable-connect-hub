import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supabaseHelpers } from "@/utils/supabaseHelpers";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof formSchema>;

type InvitationDetails = {
  id: string;
  email: string;
  school_id: string;
  school_name?: string;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState<"loading" | "valid" | "invalid" | "expired">("loading");
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token) {
        setInvitationStatus("invalid");
        setIsLoading(false);
        return;
      }

      try {
        const { data: invitationData, error: invitationError } = await supabase
          .rpc("verify_teacher_invitation", {
            token: token // Changed from invitation_token to token
          });
        
        if (invitationError || !invitationData) {
          console.error("Error verifying invitation:", invitationError || "No data returned");
          setInvitationStatus("invalid");
          setIsLoading(false);
          return;
        }

        // Define a type for the invitation data
        type VerifiedInvitation = {
          invitation_id: string;
          email: string;
          school_id: string;
          school_name?: string;
          status: string;
        };
        const typedInvitationData = invitationData as VerifiedInvitation;
        
        // For now we need to assume some properties until the RPC returns are properly typed
        if (typedInvitationData.status === 'expired') {
          setInvitationStatus("expired");
          setIsLoading(false);
          return;
        }

        if (typedInvitationData.status === 'accepted') {
          toast.info("This invitation has already been accepted.");
          navigate('/login');
          return;
        }

        // Get school name if available
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('name')
          .eq('id', supabaseHelpers.asSupabaseParam(typedInvitationData.school_id))
          .single();

        const schoolName = schoolError ? undefined : (schoolData && (schoolData as { name?: string }).name);

        setInvitationDetails({
          id: typedInvitationData.invitation_id,
          email: typedInvitationData.email,
          school_id: typedInvitationData.school_id,
          school_name: schoolName || typedInvitationData.school_name
        });

        form.setValue('email', typedInvitationData.email);
        setInvitationStatus("valid");
      } catch (error) {
        console.error("Error processing invitation:", error);
        setInvitationStatus("invalid");
      } finally {
        setIsLoading(false);
      }
    };

    verifyInvitation();
  }, [token, navigate, form]);

  const onSubmit = async (data: FormData) => {
    if (!invitationDetails) return;
    
    setIsSubmitting(true);
    
    try {
      // Register the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: 'teacher'
          }
        }
      });

      if (signUpError || !authData.user) {
        throw new Error(signUpError?.message || "Failed to create account");
      }

      // Accept the invitation
      const { error: acceptError } = await supabase
        .rpc("accept_teacher_invitation", {
          token: token as string, // Changed from invitation_token to token
          user_id: authData.user.id
        });

      if (acceptError) {
        throw new Error(acceptError?.message || "Failed to accept invitation");
      }

      // Create profile
      const profileData = supabaseHelpers.prepareTableInsert({
        id: authData.user.id,
        email: data.email,
        full_name: data.fullName,
        role: 'teacher',
        school_id: invitationDetails.school_id,
        user_type: 'teacher'
      });
      
      // Use upsert to handle profile creation
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([profileData]);

      if (profileError) {
        throw new Error(profileError.message || "Failed to create profile");
      }

      toast.success("Account created successfully!");
      navigate('/login', { state: { message: "Account created! Please sign in with your new credentials." } });
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error accepting invitation:", error);
        toast.error(error.message || "Failed to accept invitation");
      } else {
        console.error("Error accepting invitation:", error);
        toast.error("Failed to accept invitation");
      }
      setIsSubmitting(false);
    }
  };
  
  // Display different content based on invitation status
  const renderContent = () => {
    switch (invitationStatus) {
      case "loading":
        return (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-learnable-primary" />
          </div>
        );
        
      case "invalid":
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invalid Invitation</h2>
            <p className="mb-6 text-muted-foreground">This invitation link is invalid or has been revoked.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        );
        
      case "expired":
        return (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Invitation Expired</h2>
            <p className="mb-6 text-muted-foreground">This invitation has expired. Please contact your school administrator for a new invitation.</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </div>
        );
        
      case "valid":
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {invitationDetails?.school_name && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                  <p className="text-green-800">
                    You've been invited to join <strong>{invitationDetails.school_name}</strong> as a teacher.
                  </p>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        {...field} 
                        disabled={true} 
                        className="bg-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormDescription>
                      Email address from your invitation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} />
                    </FormControl>
                    <FormDescription>
                      Create a secure password (minimum 8 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Accept Invitation & Create Account"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Teacher Invitation</CardTitle>
        <CardDescription>Accept your invitation to join as a teacher</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
      {invitationStatus !== "valid" && (
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Need help? Contact your school administrator.
          </p>
        </CardFooter>
      )}
    </Card>
  );
};

export default AcceptInvitation;
