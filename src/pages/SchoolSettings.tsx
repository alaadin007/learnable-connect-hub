
import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { Navigate } from "react-router-dom";
import ApiKeyManagement from "@/components/settings/ApiKeyManagement";

const SchoolSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const { isAdmin } = useRBAC();
  const [selectedTab, setSelectedTab] = useState("general");
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">School Settings</h1>
            <p className="text-learnable-gray">
              Configure your school's settings and preferences
            </p>
          </div>

          <Tabs
            defaultValue="general"
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="space-y-4"
          >
            <TabsList className="grid grid-cols-3 md:w-[400px] mb-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Manage your school's general settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-name">School Name</Label>
                    <Input
                      id="school-name"
                      placeholder="Enter school name"
                      defaultValue={profile?.organization?.name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-code">School Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="school-code"
                        readOnly
                        value={profile?.organization?.code || ""}
                        className="bg-gray-50"
                      />
                      <Button variant="outline">Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This code is used for teacher and student registrations
                    </p>
                  </div>
                  <div className="space-y-2 pt-4">
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure email and in-app notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg mb-4">Coming soon...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations">
              <ApiKeyManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SchoolSettings;
