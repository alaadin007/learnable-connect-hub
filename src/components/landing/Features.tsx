
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, MessageSquare, School, Users } from "lucide-react";

const features = [
  {
    icon: <School className="h-10 w-10 text-learnable-blue" />,
    title: "School Management",
    description: "Register and manage your school with dedicated spaces for teachers and students",
  },
  {
    icon: <MessageSquare className="h-10 w-10 text-learnable-green" />,
    title: "AI-Powered Learning",
    description: "Engage with intelligent tutoring through our advanced AI conversation system",
  },
  {
    icon: <Users className="h-10 w-10 text-learnable-blue" />,
    title: "User Roles",
    description: "Different access levels for students, teachers, and administrators",
  },
  {
    icon: <BookOpen className="h-10 w-10 text-learnable-green" />,
    title: "Analytics & Insights",
    description: "Track learning progress and gain insights into educational outcomes",
  },
];

const Features = () => {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4 gradient-text">
            Powerful Features for Modern Education
          </h2>
          <p className="text-lg text-learnable-gray max-w-2xl mx-auto">
            Everything you need to create an engaging learning environment for your school
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="card-hover">
              <CardHeader>
                <div className="mb-2">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
