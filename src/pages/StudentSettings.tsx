
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Key, RefreshCw, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

// Define proper types for API providers
type ApiProvider = "openai" | "gemini";

const StudentSettings = () => {
  const { user } = useAuth();
  const { settings, updateSettings, saveSettings, isUpdating } = useSettings();
  const { toast: uiToast } = useToast();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState<ApiProvider>("openai");

  useEffect(() => {
    // Initialize API provider from settings if available
    if (settings?.aiProvider) {
      // Make sure we only set values that match our type
      const provider = settings.aiProvider as string;
      if (provider === "openai" || provider === "gemini") {
        setApiProvider(provider);
      } else {
        // Default to openai if the value doesn't match our type
        setApiProvider("openai");
      }
    }
    
    const fetchApiKey = async () => {
      if (!user || !apiProvider) return;
      
      try {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('api_key')
          .eq('user_id', user.id)
          .eq('provider', apiProvider)
          .single();

        if (error) {
          console.error('Error fetching API key:', error);
          return;
        }

        if (data?.api_key) {
          setApiKey(data.api_key);
        }
      } catch (err) {
        console.error('Failed to fetch API key:', err);
      }
    };

    fetchApiKey();
  }, [user, settings, apiProvider]);

  const handleSaveApiKey = async () => {
    if (!user || !apiKey || !apiProvider) return;

    try {
      // Validate API key format (basic validation only)
      if (apiProvider === "openai" && !apiKey.startsWith("sk-")) {
        toast.error('Invalid OpenAI API key format');
        return;
      }

      const { data, error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          provider: apiProvider,
          api_key: apiKey
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;

      // Update settings context with the provider
      await updateSettings({
        ...settings,
        aiProvider: apiProvider
      });

      toast.success('API key saved successfully');
      setShowApiKey(false);
    } catch (err: any) {
      console.error('Error saving API key:', err);
      toast.error('Failed to save API key');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await saveSettings();
      toast.success('Settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <p>Please log in to access your settings.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold gradient-text mb-6">Student Settings</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Settings</CardTitle>
                <CardDescription>
                  Configure how the AI assistant responds to your questions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="model">AI Model</Label>
                  <Select
                    value={settings?.model || "gpt-3.5-turbo"}
                    onValueChange={(value) => updateSettings({ ...settings, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Different models have different capabilities and costs
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="temperature">Temperature: {settings?.temperature || 0.7}</Label>
                  </div>
                  <Slider
                    id="temperature"
                    min={0}
                    max={1}
                    step={0.1}
                    defaultValue={[settings?.temperature || 0.7]}
                    onValueChange={(value) => updateSettings({ ...settings, temperature: value[0] })}
                  />
                  <p className="text-sm text-gray-500">
                    Lower values give more focused responses, higher values make responses more creative
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maxTokens">Max Response Length: {settings?.maxTokens || 500}</Label>
                  </div>
                  <Slider
                    id="maxTokens"
                    min={100}
                    max={2000}
                    step={100}
                    defaultValue={[settings?.maxTokens || 500]}
                    onValueChange={(value) => updateSettings({ ...settings, maxTokens: value[0] })}
                  />
                  <p className="text-sm text-gray-500">
                    Controls the maximum length of the AI's responses
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="sources">Show Sources</Label>
                    <p className="text-sm text-gray-500">
                      Display references for information in responses
                    </p>
                  </div>
                  <Switch
                    id="sources"
                    checked={settings?.showSources ?? true}
                    onCheckedChange={(checked) => updateSettings({ ...settings, showSources: checked })}
                  />
                </div>

                <Button
                  onClick={handleUpdateSettings}
                  className="w-full gradient-bg"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>
                  Configure your AI provider API keys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="apiProvider">API Provider</Label>
                  <Select
                    value={apiProvider}
                    onValueChange={(value: ApiProvider) => setApiProvider(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an API provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="gemini">Google Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    Select which AI provider to use with your own API key
                  </p>
                </div>

                {showApiKey ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">{apiProvider === "openai" ? "OpenAI" : "Google Gemini"} API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                      />
                      <p className="text-sm text-gray-500">
                        Your API key is stored securely and never shared
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        variant="default"
                        onClick={handleSaveApiKey}
                        className="flex-1 gradient-bg"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Key
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowApiKey(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setShowApiKey(true)}
                    className="w-full"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    {apiKey ? "Change API Key" : "Add API Key"}
                  </Button>
                )}

                <div>
                  <p className="text-sm text-gray-500">
                    Using your own API key will give you more control over the AI responses and may provide access to
                    more advanced features.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StudentSettings;
