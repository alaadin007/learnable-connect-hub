
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
import { AlertCircle, Save, Key } from "lucide-react";

interface ApiKeyEntry {
  service_name: string;
  display_name: string;
  api_key: string;
  is_set: boolean;
}

const ApiKeyManagement: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin } = useRBAC();
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([
    { service_name: "openai", display_name: "OpenAI API Key", api_key: "", is_set: false },
    { service_name: "gemini", display_name: "Gemini API Key", api_key: "", is_set: false }
  ]);
  const [loading, setLoading] = useState<boolean>(false);
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
      const { data, error } = await supabase
        .from('api_keys')
        .select('service_name')
        .in('service_name', apiKeys.map(k => k.service_name));
        
      if (error) throw error;
      
      if (data) {
        const existingServices = new Set(data.map(item => item.service_name));
        
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
    
    setLoading(true);
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
      setLoading(false);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key Management
        </CardTitle>
        <CardDescription>
          Manage API keys for AI services and other integrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {apiKeys.map((apiKey) => (
          <div key={apiKey.service_name} className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor={apiKey.service_name}>{apiKey.display_name}</Label>
              {apiKey.is_set && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  Set
                </span>
              )}
            </div>
            
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
                disabled={loading || !apiKey.api_key.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
            
            {apiKey.service_name === 'openai' && (
              <p className="text-xs text-muted-foreground">
                Get your OpenAI API key from the 
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-primary ml-1">
                  OpenAI platform
                </a>
              </p>
            )}
            
            {apiKey.service_name === 'gemini' && (
              <p className="text-xs text-muted-foreground">
                Get your Gemini API key from the 
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-primary ml-1">
                  Google AI Studio
                </a>
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ApiKeyManagement;
