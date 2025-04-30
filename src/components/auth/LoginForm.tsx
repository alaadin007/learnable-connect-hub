
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const LoginForm = () => {
  // This would be replaced with actual Supabase integration
  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    // This is a placeholder for actual authentication
    toast.success("Login attempt registered! Please connect to Supabase to enable authentication.");
  };

  return (
    <div className="max-w-md w-full mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Enter your email and password to log in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@school.edu" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-learnable-blue hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" />
            </div>
            <Button type="submit" className="w-full gradient-bg">
              Log in
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-600 text-center w-full">
            Don't have an account?{" "}
            <Link to="/register" className="text-learnable-blue hover:underline">
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginForm;
