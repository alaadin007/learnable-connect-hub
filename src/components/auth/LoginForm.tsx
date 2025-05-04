
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn, isLoading, setTestUser } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [testLoginInProgress, setTestLoginInProgress] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      setLoginError(null);
      const { email, password } = values;

      try {
        // Check if this is a test account email
        if (email.includes(".test@learnable.edu")) {
          // Determine the account type from email
          let type: "school" | "teacher" | "student" = "student";
          if (email.startsWith("school")) type = "school";
          else if (email.startsWith("teacher")) type = "teacher";
          
          console.log(`Test account detected: ${type}. Processing instant login...`);
          
          // For test accounts, bypass loading states completely
          localStorage.setItem("testUserRole", type);
          localStorage.setItem("testUserIndex", "0");
          
          try {
            // Handle test account directly with setTestUser, hide loading state
            await setTestUser(type, 0, false);
            // Navigation is handled inside setTestUser
          } catch (error: any) {
            console.error("Test account setup failed:", error);
            setLoginError(error.message || "Failed to set up test account");
          }
          
          return;
        }
        
        // Regular authentication for real users
        await signIn(email, password);
        // Navigation is handled in AuthContext on successful sign-in
      } catch (error: any) {
        console.error("Login failed:", error);
        setLoginError(
          error.message || "Invalid credentials. Please try again."
        );
        toast.error(
          error.message || "Invalid credentials. Please check your inputs."
        );
      }
    },
    [signIn, setTestUser]
  );
  
  const handleTestAccountClick = async (accountType: string) => {
    // Skip setting loading state for test accounts
    try {
      console.log(`Direct test login for ${accountType} account`);
      
      // Immediately store role for quicker detection
      localStorage.setItem("testUserRole", accountType);
      localStorage.setItem("testUserIndex", "0");
      
      // Pass false to setTestUser to skip loading states
      await setTestUser(accountType, 0, false);
      // Navigation handled inside setTestUser
    } catch (error: any) {
      console.error("Test account setup failed:", error);
      setLoginError(`Test account setup failed: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 w-full"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email" {...field} type="email" />
              </FormControl>
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
                <Input
                  placeholder="Password"
                  {...field}
                  type="password"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {loginError && (
          <p className="text-red-500 text-sm">{loginError}</p>
        )}
        <Button
          type="submit"
          className="w-full bg-learnable-blue hover:bg-learnable-blue/90"
          disabled={isLoading || !!testLoginInProgress}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Login"
          )}
        </Button>
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => navigate("/test-accounts")}
            className="text-sm"
            disabled={!!testLoginInProgress}
          >
            Try test accounts instead
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;
