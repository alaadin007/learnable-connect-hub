
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidObject } from "@/utils/supabaseHelpers";

const API_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', description: 'Used for AI tutoring and content generation' },
  { id: 'gemini', name: 'Google Gemini', description: 'Alternative AI model for tutoring' },
];

interface ApiKeyState {
  openai: string;
  gemini: string;
  [key: string]: string;
}

const ApiKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeyState>({
    openai: '',
    gemini: '',
  });
  const [savingKey, setSavingKey] = useState('');
  const [loadingKeys, setLoadingKeys] = useState(true);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoadingKeys(true);

      // Get the current API keys
      const { data, error } = await supabase
        .from('api_keys')
        .select('service_name, api_key');

      if (error) {
        console.error("Error fetching API keys:", error);
        toast.error("Failed to load API keys");
        return;
      }

      const newApiKeys: ApiKeyState = {
        openai: '',
        gemini: '',
      };

      // Process data safely
      if (Array.isArray(data)) {
        data.forEach(item => {
          // Safely check the service_name property exists
          if (item && isValidObject(item, ['service_name', 'api_key'])) {
            const serviceName = String(item.service_name);
            if (serviceName && serviceName in newApiKeys) {
              newApiKeys[serviceName] = String(item.api_key || '');
            }
          }
        });
      }

      setApiKeys(newApiKeys);
    } catch (error) {
      console.error("Error loading API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setLoadingKeys(false);
    }
  };

  const handleSaveKey = async (serviceId: string) => {
    if (!apiKeys[serviceId].trim()) {
      toast.error(`Please enter a valid API key for ${getServiceName(serviceId)}`);
      return;
    }

    setSavingKey(serviceId);
    try {
      const { data, error } = await supabase.rpc('set_api_key', {
        service: serviceId,
        key_value: apiKeys[serviceId].trim()
      });

      if (error) {
        throw error;
      }

      toast.success(`${getServiceName(serviceId)} API key saved successfully`);
    } catch (error: any) {
      console.error("Error saving API key:", error);
      toast.error(error.message || "Failed to save API key");
    } finally {
      setSavingKey('');
    }
  };

  const getServiceName = (serviceId: string): string => {
    const provider = API_PROVIDERS.find(p => p.id === serviceId);
    return provider ? provider.name : serviceId;
  };

  const handleChange = (serviceId: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [serviceId]: value
    }));
  };

  if (loadingKeys) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API Connections</CardTitle>
        <CardDescription>
          Configure API keys for various services used by the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {API_PROVIDERS.map((provider) => (
          <div key={provider.id} className="space-y-2">
            <Label htmlFor={`api-key-${provider.id}`} className="text-base font-semibold">
              {provider.name} API Key
            </Label>
            <p className="text-sm text-muted-foreground mb-2">{provider.description}</p>
            <div className="flex space-x-2">
              <Input
                id={`api-key-${provider.id}`}
                type="password"
                placeholder={`Enter ${provider.name} API Key`}
                value={apiKeys[provider.id]}
                onChange={(e) => handleChange(provider.id, e.target.value)}
                className="flex-grow"
              />
              <Button 
                onClick={() => handleSaveKey(provider.id)} 
                disabled={savingKey === provider.id}
              >
                {savingKey === provider.id ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving</>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
            {apiKeys[provider.id] ? (
              <p className="text-xs text-green-600">API key is set</p>
            ) : (
              <p className="text-xs text-amber-600">No API key configured</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ApiKeyManagement;
