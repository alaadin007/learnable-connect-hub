
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';
import { useSettings } from "@/contexts/SettingsContext";
import { Key, ChevronLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";

const StudentSettings = () => {
  const { user } = useAuth();
  const { settings, saveApiKey } = useSettings();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  
  // Update the provider type to use strict literals
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");

  useEffect(() => {
    if (settings.openAiKey) {
      setApiKey(settings.openAiKey);
      setProvider("openai");
    } else if (settings.geminiKey) {
      setApiKey(settings.geminiKey);
      setProvider("gemini");
    }
  }, [settings.openAiKey, settings.geminiKey]);

  const handleApiKeySubmit = async () => {
    setIsSaving(true);
    try {
      await saveApiKey(provider, apiKey);
      toast.success("API Key saved successfully");
      setShowApiKeyForm(false);
    } catch (error: any) {
      console.error("Error saving API key:", error);
      toast.error(error.message || "Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mr-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Student Settings</h1>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">User ID</Label>
                  <Input id="id" value={user.id} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email || ""} readOnly />
                </div>
                
                {!settings.openAiKey && !settings.geminiKey && (
                  <Button
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => setShowApiKeyForm(true)}
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Set API Key
                  </Button>
                )}
                
                {showApiKeyForm && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Select value={provider} onValueChange={(value) => setProvider(value as "openai" | "gemini")}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleApiKeySubmit} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save API Key"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p>Please log in to view your settings.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentSettings;
