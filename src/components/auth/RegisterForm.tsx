
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const RegisterForm = () => {
  // This would be replaced with actual Supabase integration
  const handleRegister = (event: React.FormEvent) => {
    event.preventDefault();
    // This is a placeholder for actual authentication
    toast.success("Registration successful! Please connect to Supabase to enable authentication.");
  };

  return (
    <div className="max-w-md w-full mx-auto p-4">
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Choose your account type to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="school" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="school">School</TabsTrigger>
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
              <TabsTrigger value="student">Student</TabsTrigger>
            </TabsList>
            <TabsContent value="school" className="mt-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input id="school-name" placeholder="Enter school name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-name">Administrator Name</Label>
                  <Input id="admin-name" placeholder="Full name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-email">Email</Label>
                  <Input id="school-email" type="email" placeholder="admin@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-password">Password</Label>
                  <Input id="school-password" type="password" />
                </div>
                <Button type="submit" className="w-full gradient-bg">
                  Register School
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="teacher" className="mt-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher-name">Full Name</Label>
                  <Input id="teacher-name" placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-email">Email</Label>
                  <Input id="teacher-email" type="email" placeholder="teacher@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-code">School Code</Label>
                  <Input id="school-code" placeholder="Enter school registration code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teacher-password">Password</Label>
                  <Input id="teacher-password" type="password" />
                </div>
                <Button type="submit" className="w-full gradient-bg">
                  Register as Teacher
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="student" className="mt-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-name">Full Name</Label>
                  <Input id="student-name" placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email</Label>
                  <Input id="student-email" type="email" placeholder="student@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-code">School Code</Label>
                  <Input id="student-code" placeholder="Enter school registration code" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <Input id="student-password" type="password" />
                </div>
                <Button type="submit" className="w-full gradient-bg">
                  Register as Student
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-gray-600 text-center w-full">
            Already have an account?{" "}
            <Link to="/login" className="text-learnable-blue hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RegisterForm;
