
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, School, User } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TestAccounts = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setTestUser } = useAuth();
  
  const accountOptions = [
    {
      title: "Student",
      icon: <GraduationCap className="h-10 w-10 text-blue-500" />,
      description: "Experience the platform from a student's perspective.",
      type: "student",
      destination: "/dashboard",
    },
    {
      title: "Teacher",
      icon: <User className="h-10 w-10 text-green-500" />,
      description: "Explore the platform from a teacher's perspective.",
      type: "teacher",
      destination: "/dashboard",
    },
    {
      title: "School Admin",
      icon: <School className="h-10 w-10 text-purple-500" />,
      description: "Manage your school settings and users.",
      type: "school",
      destination: "/dashboard",
    },
  ];

  const handleSelectAccount = async (type: "student" | "teacher" | "school", destination: string) => {
    setLoading(true);
    try {
      // Use the setTestUser function to create a mock user
      setTestUser(type);
      
      toast.success(`Successfully switched to ${type} account`);
      navigate(destination, {
        state: {
          fromTestAccounts: true,
          accountType: type,
        },
      });
    } catch (error) {
      console.error("Error setting test user:", error);
      toast.error("Failed to set test user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Try Our Demo</h1>
              <p className="text-xl text-learnable-gray">
                Choose an account type to explore the platform with pre-configured test data.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {accountOptions.map((option) => (
                <Card key={option.type} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-center mb-4">
                      {option.icon}
                    </div>
                    <CardTitle>{option.title}</CardTitle>
                    <CardDescription>
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-2">
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span>No account creation needed</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span>Pre-populated test data</span>
                      </li>
                      <li className="flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        <span>Full feature access</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full"
                      onClick={() => handleSelectAccount(option.type as "student" | "teacher" | "school", option.destination)}
                      disabled={loading}
                    >
                      Try as {option.title}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            <div className="mt-12 text-center">
              <p className="text-learnable-gray mb-4">
                Want to create your own account instead?
              </p>
              <Button variant="outline" onClick={() => navigate("/register")}>
                Register Now
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestAccounts;
