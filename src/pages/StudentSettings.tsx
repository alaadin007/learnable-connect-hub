
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
import { AIProvider } from '@/contexts/SettingsContext';

const StudentSettings = () => {
  const { user } = useAuth();
  const { settings, saveApiKey, setAIProvider, saveSettings, isUpdating } = useSettings();
  const [apiKey, setApiKey] = useState("");
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [aiModel, setAiModel] = useState(settings.model);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens);
  const [showSources, setShowSources] = useState(settings.showSources);
  const [provider, setProvider] = useState<AIProvider>(settings.aiProvider as AIProvider || 'openai');

  // Form state for API key
  const [formState, setFormState] = useState({
    provider: provider,
    apiKey: ''
  });

  // Reset form values when settings change
  useEffect(() => {
    setAiModel(settings.model);
    setTemperature(settings.temperature);
    setMaxTokens(settings.maxTokens);
    setShowSources(settings.showSources);
    setProvider(settings.aiProvider as AIProvider || 'openai');
  }, [settings]);

  const handleSaveSettings = async () => {
    const updatedSettings = {
      model: aiModel,
      temperature: temperature,
      maxTokens: maxTokens,
      showSources: showSources,
      aiProvider: provider
    };
    
    const result = await saveSettings(updatedSettings);
    
    if (result) {
      toast.success("Settings saved successfully");
    } else {
      toast.error("Failed to save settings");
    }
  };

  const handleApiKeySubmit = async () => {
    if (!formState.apiKey) {
      toast.error("Please enter an API key");
      return;
    }
    
    setIsTestingKey(true);
    try {
      const result = await saveApiKey(formState.provider, formState.apiKey);
      
      if (result) {
        toast.success(`${formState.provider.toUpperCase()} API key saved successfully`);
        setFormState({ ...formState, apiKey: '' });
      }
    } catch (error) {
      console.error("Error saving API key:", error);
      toast.error("Failed to save API key");
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container max-w-4xl">
          <h1 className="text-2xl font-bold mb-6">Settings</h1>
          
          <div className="grid gap-6">
            {/* API Keys */}
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Configure your AI provider API keys
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Provider</Label>
                      <Select 
                        value={formState.provider} 
                        onValueChange={(value: AIProvider) => setFormState({ ...formState, provider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select AI provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI (GPT-3.5/4)</SelectItem>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          id="apiKey"
                          value={formState.apiKey}
                          onChange={(e) => setFormState({ ...formState, apiKey: e.target.value })}
                          placeholder={`Enter your ${formState.provider === 'openai' ? 'OpenAI' : 'Google Gemini'} API key`}
                          className="flex-grow"
                        />
                        <Button 
                          onClick={handleApiKeySubmit} 
                          disabled={isTestingKey || !formState.apiKey}
                        >
                          {isTestingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formState.provider === 'openai' ? (
                          <>Your OpenAI API key is stored securely and used only for your requests. <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Get your API key here</a>.</>
                        ) : (
                          <>Your Google Gemini API key is stored securely and used only for your requests. <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Get your API key here</a>.</>
                        )}
                      </p>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <Label>Current Provider</Label>
                        <div className="flex items-center gap-4">
                          {settings.openAiKey && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${settings.aiProvider === 'openai' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              <div className={`w-2 h-2 rounded-full ${settings.aiProvider === 'openai' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <span className="text-xs font-medium">OpenAI</span>
                            </div>
                          )}
                          
                          {settings.geminiKey && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded ${settings.aiProvider === 'gemini' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              <div className={`w-2 h-2 rounded-full ${settings.aiProvider === 'gemini' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                              <span className="text-xs font-medium">Gemini</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {(settings.openAiKey || settings.geminiKey) && (
                        <div className="pt-2">
                          <Label>Select Active Provider</Label>
                          <div className="flex gap-2 mt-2">
                            {settings.openAiKey && (
                              <Button
                                variant={settings.aiProvider === 'openai' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAIProvider('openai')}
                                disabled={isUpdating}
                              >
                                Use OpenAI
                              </Button>
                            )}
                            
                            {settings.geminiKey && (
                              <Button
                                variant={settings.aiProvider === 'gemini' ? "default" : "outline"}
                                size="sm"
                                onClick={() => setAIProvider('gemini')}
                                disabled={isUpdating}
                              >
                                Use Gemini
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>AI Chat Settings</CardTitle>
                <CardDescription>
                  Configure how the AI responds to your queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select value={aiModel} onValueChange={setAiModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast)</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini (Balanced)</SelectItem>
                          <SelectItem value="gpt-4o">GPT-4o (Advanced)</SelectItem>
                          <SelectItem value="gemini-1.0-pro">Gemini 1.0 Pro</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select which AI model to use. More advanced models may give better answers but may be slower or more expensive.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Temperature: {temperature}</Label>
                        <span className="text-xs text-muted-foreground">{temperature < 0.3 ? 'More precise' : temperature > 0.7 ? 'More creative' : 'Balanced'}</span>
                      </div>
                      <Slider 
                        value={[temperature]} 
                        min={0} 
                        max={1} 
                        step={0.1} 
                        onValueChange={([value]) => setTemperature(value)} 
                      />
                      <p className="text-xs text-muted-foreground">
                        Lower values produce more consistent, factual responses. Higher values produce more diverse, creative responses.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Max Tokens: {maxTokens}</Label>
                      </div>
                      <Slider 
                        value={[maxTokens]} 
                        min={100} 
                        max={1000} 
                        step={50}
                        onValueChange={([value]) => setMaxTokens(value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum length of the AI response. Higher values allow for longer answers.
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch 
                        id="show-sources" 
                        checked={showSources} 
                        onCheckedChange={setShowSources}
                      />
                      <Label htmlFor="show-sources">Show source references in answers</Label>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveSettings} disabled={isUpdating} className="w-full">
                    {isUpdating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Settings
                  </Button>
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
