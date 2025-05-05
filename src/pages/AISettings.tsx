
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const apiKeySchema = z.object({
  openai_api_key: z.string().optional(),
  gemini_api_key: z.string().optional(),
});

type ApiKeyFormValues = z.infer<typeof apiKeySchema>;

const AISettings = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingKeys, setIsCheckingKeys] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeProvider, setActiveProvider] = useState<"openai" | "gemini">("openai");
  const [hasOpenAIKey, setHasOpenAIKey] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      openai_api_key: "",
      gemini_api_key: "",
    },
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Check if API keys are already set
  useEffect(() => {
    const checkApiKeys = async () => {
      if (!user) return;
      
      setIsCheckingKeys(true);
      setError(null);
      
      try {
        // Check for OpenAI key
        const openAIResponse = await supabase.functions.invoke("check-api-key", {
          body: { provider: "openai" }
        });
        
        if (openAIResponse.error) {
          console.error("Error checking OpenAI API key:", openAIResponse.error);
          setError(`Error checking OpenAI key: ${openAIResponse.error.message || 'Unknown error'}`);
        } else {
          setHasOpenAIKey(openAIResponse.data?.exists || false);
        }
        
        // Check for Gemini key
        const geminiResponse = await supabase.functions.invoke("check-api-key", {
          body: { provider: "gemini" }
        });
        
        if (geminiResponse.error) {
          console.error("Error checking Gemini API key:", geminiResponse.error);
          if (!error) {
            setError(`Error checking Gemini key: ${geminiResponse.error.message || 'Unknown error'}`);
          }
        } else {
          setHasGeminiKey(geminiResponse.data?.exists || false);
        }
      } catch (error) {
        console.error("Error checking API keys:", error);
        setError(`Failed to check API keys: ${error.message || 'Unknown error'}`);
      } finally {
        setIsCheckingKeys(false);
        setIsLoading(false);
      }
    };
    
    if (user && !authLoading) {
      checkApiKeys();
    } else if (!authLoading) {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const onSubmit = async (values: ApiKeyFormValues) => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Save API key based on active provider
      const provider = activeProvider;
      const apiKey = provider === "openai" ? values.openai_api_key : values.gemini_api_key;
      
      if (!apiKey) {
        toast.error("Please enter an API key");
        setIsSaving(false);
        return;
      }
      
      const response = await supabase.functions.invoke("save-api-key", {
        body: { provider, apiKey }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Unknown error");
      }
      
      // Update state to show key exists
      if (provider === "openai") {
        setHasOpenAIKey(true);
        form.setValue("openai_api_key", "");
      } else {
        setHasGeminiKey(true);
        form.setValue("gemini_api_key", "");
      }
      
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved successfully`);
    } catch (error) {
      console.error("Error saving API key:", error);
      setError(`Failed to save API key: ${error.message || 'Unknown error'}`);
      toast.error("Failed to save API key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveKey = async (provider: "openai" | "gemini") => {
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const response = await supabase.functions.invoke("remove-api-key", {
        body: { provider }
      });
      
      if (response.error) {
        throw new Error(response.error.message || "Unknown error");
      }
      
      // Update state to show key doesn't exist
      if (provider === "openai") {
        setHasOpenAIKey(false);
      } else {
        setHasGeminiKey(false);
      }
      
      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key removed successfully`);
    } catch (error) {
      console.error("Error removing API key:", error);
      setError(`Failed to remove API key: ${error.message || 'Unknown error'}`);
      toast.error("Failed to remove API key. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderLoadingState = () => (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-10 w-1/3" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">AI Settings</h1>
            <p className="text-gray-600">
              Configure your AI providers to enable AI chat functionality
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                AI API Keys
              </CardTitle>
              <CardDescription>
                Add your API keys to enable AI chat functionality. Your keys are securely stored and never shared.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-6">
                  {renderLoadingState()}
                </div>
              ) : error ? (
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Error loading API key settings</h4>
                    <p className="text-sm">{error}</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="mt-2 text-red-700 border-red-300"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <Tabs 
                  value={activeProvider} 
                  onValueChange={(value) => setActiveProvider(value as "openai" | "gemini")}
                  className="w-full"
                >
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="openai" className="flex-1">OpenAI</TabsTrigger>
                    <TabsTrigger value="gemini" className="flex-1">Google Gemini</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="openai">
                    <div className="space-y-4">
                      <div className="rounded-md bg-blue-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Key className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">OpenAI API Key</h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>Your OpenAI API key allows the app to use GPT models for chat functionality.</p>
                              <p className="mt-1">
                                <a 
                                  href="https://platform.openai.com/api-keys" 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="font-medium underline hover:text-blue-800"
                                >
                                  Get your OpenAI API key here
                                </a>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isCheckingKeys ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                          <span className="ml-2">Checking for existing API key...</span>
                        </div>
                      ) : hasOpenAIKey ? (
                        <div className="flex items-center justify-between rounded-md border p-4">
                          <div>
                            <p className="font-medium text-gray-700">OpenAI API Key is set</p>
                            <p className="text-sm text-gray-500">Your key is securely stored</p>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleRemoveKey("openai")}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Remove Key"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                              control={form.control}
                              name="openai_api_key"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>OpenAI API Key</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="sk-..." 
                                      type="password"
                                      {...field} 
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Enter your OpenAI API key to enable AI chat features
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" disabled={isSaving}>
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                  Saving...
                                </>
                              ) : (
                                "Save API Key"
                              )}
                            </Button>
                          </form>
                        </Form>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="gemini">
                    <div className="space-y-4">
                      <div className="rounded-md bg-blue-50 p-4">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Key className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Google Gemini API Key</h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>Your Google Gemini API key allows the app to use Gemini models for chat functionality.</p>
                              <p className="mt-1">
                                <a 
                                  href="https://makersuite.google.com/app/apikey" 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="font-medium underline hover:text-blue-800"
                                >
                                  Get your Gemini API key here
                                </a>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {isCheckingKeys ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                          <span className="ml-2">Checking for existing API key...</span>
                        </div>
                      ) : hasGeminiKey ? (
                        <div className="flex items-center justify-between rounded-md border p-4">
                          <div>
                            <p className="font-medium text-gray-700">Gemini API Key is set</p>
                            <p className="text-sm text-gray-500">Your key is securely stored</p>
                          </div>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleRemoveKey("gemini")}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Remove Key"
                            )}
                          </Button>
                        </div>
                      ) : (
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                              control={form.control}
                              name="gemini_api_key"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Google Gemini API Key</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="AIza..." 
                                      type="password" 
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Enter your Google Gemini API key to enable AI chat features
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button type="submit" disabled={isSaving}>
                              {isSaving ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                  Saving...
                                </>
                              ) : (
                                "Save API Key"
                              )}
                            </Button>
                          </form>
                        </Form>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AISettings;
