import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";

const StudentSettings = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.5);
  const [aiProvider, setAiProvider] = useState<"openai" | "gemini">("openai");
  const [showSources, setShowSources] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  useEffect(() => {
    const loadUserSettings = async () => {
      if (user) {
        const { data, error } = await supabase.rpc('get_user_settings', {
          user_id_param: user.id,
        });

        if (error) {
          console.error("Error fetching user settings:", error);
          toast.error("Failed to load user settings");
          return;
        }

        if (data && data.length > 0) {
          setMaxTokens(data[0].max_tokens);
          setTemperature(data[0].temperature);
          setAiProvider(data[0].model === "gemini" ? "gemini" : "openai");
          setShowSources(data[0].show_sources);
        }
      }
    };

    loadUserSettings();
  }, [user]);

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const providerValue = aiProvider === "openai" || aiProvider === "gemini" 
        ? aiProvider 
        : "openai" as const;

      const { error } = await supabase.rpc('update_user_settings', {
        user_id_param: user!.id,
        max_tokens_param: maxTokens,
        temperature_param: temperature,
        model_param: providerValue,
        show_sources_param: showSources,
      });

      if (error) {
        console.error("Error saving settings:", error);
        toast.error("Failed to save settings");
        return;
      }

      toast.success("Settings saved successfully!");
      setAiProvider(providerValue);
      await refreshProfile();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold gradient-text mb-2">Student Settings</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="Your email"
                  value={email}
                  readOnly
                />
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSettingsSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiProvider">AI Provider</Label>
                  <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as "openai" | "gemini")}>
                    <SelectTrigger id="aiProvider">
                      <SelectValue placeholder="Select AI Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    placeholder="Max Tokens"
                    value={maxTokens.toString()}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    placeholder="Temperature"
                    value={temperature.toString()}
                    onChange={(e) => setTemperature(Number(e.target.value))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showSources"
                    className="h-4 w-4"
                    checked={showSources}
                    onChange={(e) => setShowSources(e.target.checked)}
                  />
                  <Label htmlFor="showSources">Show Sources</Label>
                </div>

                <Button type="submit" className="gradient-bg" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentSettings;
