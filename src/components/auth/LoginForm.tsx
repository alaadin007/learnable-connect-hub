
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const formSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address."
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
})

const LoginForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await signIn(data.email, data.password);
      
      if (result?.error) {
        toast.error(result.error.message || "Failed to sign in");
      } else if (result?.success) {
        toast.success("Signed in successfully!");
        // Let the auth context handle the redirect based on user role
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Login to LearnAble</CardTitle>
        <CardDescription>Enter your email and password to login</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register("email")}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register("password")}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2 items-stretch">
        <Button 
          type="submit" 
          form="login-form"
          className="w-full" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </Button>
        <div className="text-sm text-center text-gray-500 pt-2">
          Don't have an account?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/register')}>
            Sign up
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default LoginForm;
