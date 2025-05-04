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

      // Add this check in the handleSubmit function or similar:
      if (email.includes(".test@learnable.edu")) {
        // If this is a test account email, handle it directly through setTestUser
        let type: "school" | "teacher" | "student" = "student";
        if (email.startsWith("school")) type = "school";
        else if (email.startsWith("teacher")) type = "teacher";
        console.log(`Test account detected: ${type}. Instantly logging in...`);
        setTestUser(type);
        return;
      }

      try {
        await signIn(email, password);
        // No navigation here; AuthContext handles it on successful sign-in
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
          disabled={isLoading}
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
            onClick={() => navigate("/forgot-password")}
            className="text-sm"
          >
            Forgot password?
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoginForm;
