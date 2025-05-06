
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/contexts/RBACContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Save, Key, Link, ExternalLink, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ApiKeyEntry {
  service_name: string;
  display_name: string;
  api_key: string;
  is_set: boolean;
  description: string;
  help_url: string;
}

const ApiKeyManagement: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([
    { 
      service_name: "openai", 
      display_name: "OpenAI API Key", 
      api_key: "", 
      is_set: false,
      description: "Required for GPT models. Used for advanced AI chat features.",
      help_url: "https://platform.openai.com/api-keys"
    },
    { 
      service_name: "gemini", 
      display_name: "Gemini API Key", 
      api_key: "", 
      is_set: false,
      description: "Alternative AI provider. Can be used instead of OpenAI.",
      help_url: "https://aistudio.google.com/app/apikey"
    }
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && isAdmin) {
      checkExistingKeys();
    }
  }, [user, isAdmin]);

  const checkExistingKeys = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if keys exist (we don't fetch the actual keys for security)
      const serviceNames = apiKeys.map(k => k.service_name);
      const { data, error } = await supabase
        .from('api_keys')
        .select('service_name')
        .in('service_name', serviceNames as any);
        
      if (error) throw error;
      
      if (data) {
        const existingServices = new Set(
          data.filter(item => item && typeof item === 'object' && 'service_name' in item)
              .map(item => item.service_name)
        );
        
        setApiKeys(prev => prev.map(key => ({
          ...key,
          is_set: existingServices.has(key.service_name),
          // Clear the input field but mark as set if exists
          api_key: existingServices.has(key.service_name) ? "" : key.api_key
        })));
      }
    } catch (err: any) {
      console.error("Error checking API keys:", err);
      setError(err.message || "Failed to check existing API keys");
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyChange = (serviceName: string, value: string) => {
    setApiKeys(prev => prev.map(key => 
      key.service_name === serviceName ? { ...key, api_key: value } : key
    ));
  };

  const saveApiKey = async (serviceName: string) => {
    const apiKey = apiKeys.find(k => k.service_name === serviceName);
    if (!apiKey || !apiKey.api_key.trim()) {
      toast.error("Please enter a valid API key");
      return;
    }
    
    setSaving(serviceName);
    try {
      const { data, error } = await supabase.rpc(
        'set_api_key',
        { 
          service: serviceName,
          key_value: apiKey.api_key.trim()
        }
      );
      
      if (error) throw error;
      
      toast.success(`${apiKey.display_name} saved successfully`);
      
      // Update local state
      setApiKeys(prev => prev.map(key => 
        key.service_name === serviceName 
          ? { ...key, is_set: true, api_key: "" } 
          : key
      ));
    } catch (err: any) {
      console.error("Error saving API key:", err);
      toast.error(err.message || "Failed to save API key");
    } finally {
      setSaving(null);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Key Management</CardTitle>
          <CardDescription>Manage API keys for various services</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Only administrators can manage API keys.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          AI Service API Keys
        </CardTitle>
        <CardDescription>
          Add your API keys to enable AI chat features for your school
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700">Why API Keys are Needed</AlertTitle>
          <AlertDescription className="text-blue-600">
            You need to add at least one API key (either OpenAI or Gemini) to enable AI chat 
            features for your school. These keys will be stored securely and used only for 
            your school's AI features.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          apiKeys.map((apiKey) => (
            <div key={apiKey.service_name} className="space-y-3 p-4 border rounded-md bg-card">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Label htmlFor={apiKey.service_name} className="text-lg font-medium">
                    {apiKey.display_name}
                  </Label>
                  {apiKey.is_set && (
                    <span className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3" /> Configured
                    </span>
                  )}
                </div>
                <a 
                  href={apiKey.help_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs flex items-center gap-1 text-primary hover:underline"
                >
                  Get API Key <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              
              <p className="text-sm text-muted-foreground">{apiKey.description}</p>
              
              <div className="flex gap-2">
                <Input
                  id={apiKey.service_name}
                  type="password"
                  placeholder={apiKey.is_set ? "••••••••••••••••" : "Enter API key"}
                  value={apiKey.api_key}
                  onChange={(e) => handleApiKeyChange(apiKey.service_name, e.target.value)}
                  className="flex-grow"
                />
                <Button 
                  onClick={() => saveApiKey(apiKey.service_name)}
                  disabled={saving === apiKey.service_name || !apiKey.api_key.trim()}
                  className={apiKey.is_set ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving === apiKey.service_name ? "Saving..." : apiKey.is_set ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          ))
        )}

        {!loading && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-medium mb-2">What happens next?</h3>
            <p className="text-sm text-muted-foreground mb-2">
              After saving your API keys:
            </p>
            <ul className="text-sm list-disc pl-5 text-muted-foreground">
              <li>AI chat features will automatically be enabled</li>
              <li>Students and teachers can use the AI to help with their learning</li>
              <li>Usage of the API is billed directly to your account with the API provider</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKeyManagement;
