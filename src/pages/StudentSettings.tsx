
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/landing/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings,
  MessageCircle,
  User,
  Lock,
  Key,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const profileFormSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "gemini"]),
  openAiKey: z.string().optional(),
  geminiKey: z.string().optional(),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(2000),
  showSources: z.boolean(),
});

const securityFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const StudentSettings: React.FC = () => {
  const { user, profile } = useAuth();
  const { settings, updateSettings, isLoading } = useSettings();
  const [activeTab, setActiveTab] = useState<string>("profile");
  const navigate = useNavigate();

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
      email: user?.email || "",
    },
  });

  const aiSettingsForm = useForm<z.infer<typeof aiSettingsSchema>>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      provider: settings?.aiProvider || "openai",
      openAiKey: settings?.openAiKey || "",
      geminiKey: settings?.geminiKey || "",
      model: settings?.model || "gpt-3.5-turbo",
      temperature: settings?.temperature || 0.5,
      maxTokens: settings?.maxTokens || 400,
      showSources: settings?.showSources !== false,
    },
  });

  const securityForm = useForm<z.infer<typeof securityFormSchema>>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form values when profile or settings change
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        fullName: profile.full_name || "",
        email: user?.email || "",
      });
    }
    if (settings && !isLoading) {
      aiSettingsForm.reset({
        provider: settings.aiProvider || "openai",
        openAiKey: settings.openAiKey || "",
        geminiKey: settings.geminiKey || "",
        model: settings.model || "gpt-3.5-turbo",
        temperature: settings.temperature || 0.5,
        maxTokens: settings.maxTokens || 400,
        showSources: settings.showSources !== false,
      });
    }
  }, [profile, settings, isLoading, user, profileForm, aiSettingsForm]);

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    try {
      if (!user) return;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.fullName,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const onAISettingsSubmit = async (values: z.infer<typeof aiSettingsSchema>) => {
    try {
      // First validate that the required key is provided based on selected provider
      if (values.provider === "openai" && !values.openAiKey) {
        aiSettingsForm.setError("openAiKey", {
          type: "manual",
          message: "OpenAI API key is required",
        });
        return;
      }

      if (values.provider === "gemini" && !values.geminiKey) {
        aiSettingsForm.setError("geminiKey", {
          type: "manual",
          message: "Gemini API key is required",
        });
        return;
      }

      await updateSettings(values);
      toast.success("AI settings updated successfully");
    } catch (error) {
      console.error("Error updating AI settings:", error);
      toast.error("Failed to update AI settings");
    }
  };

  const onSecuritySubmit = async (values: z.infer<typeof securityFormSchema>) => {
    try {
      // This is just a placeholder - actual password update would use Supabase
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });
      
      if (error) throw error;
      
      toast.success("Password updated successfully");
      securityForm.reset();
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Failed to update password");
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: "/student/settings" } });
    }
  }, [user, navigate]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-learnable-super-light py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold gradient-text mb-2">Settings</h1>
            <p className="text-learnable-gray">
              Manage your account preferences and settings
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Settings Menu</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="flex flex-col h-auto space-y-1">
                    <TabsTrigger
                      value="profile"
                      className="w-full justify-start"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="w-full justify-start">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      AI Chat Settings
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="w-full justify-start"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      Security
                    </TabsTrigger>
                  </TabsList>

                  {/* Move TabsContent blocks inside the parent Tabs component */}
                  <div className="lg:hidden mt-4">
                    <TabsContent value="profile">
                      <ProfileContent 
                        profileForm={profileForm} 
                        onSubmit={onProfileSubmit} 
                      />
                    </TabsContent>
                    <TabsContent value="ai">
                      <AISettingsContent 
                        aiSettingsForm={aiSettingsForm} 
                        onSubmit={onAISettingsSubmit}
                      />
                    </TabsContent>
                    <TabsContent value="security">
                      <SecurityContent 
                        securityForm={securityForm}
                        onSubmit={onSecuritySubmit}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
              </CardContent>
            </Card>

            <div className="col-span-1 lg:col-span-3 hidden lg:block">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="profile">
                  <ProfileContent 
                    profileForm={profileForm} 
                    onSubmit={onProfileSubmit} 
                  />
                </TabsContent>
                <TabsContent value="ai">
                  <AISettingsContent 
                    aiSettingsForm={aiSettingsForm} 
                    onSubmit={onAISettingsSubmit}
                  />
                </TabsContent>
                <TabsContent value="security">
                  <SecurityContent 
                    securityForm={securityForm}
                    onSubmit={onSecuritySubmit}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Separate profile content into its own component for better organization
interface ProfileContentProps {
  profileForm: any;
  onSubmit: (values: any) => Promise<void>;
}

const ProfileContent: React.FC<ProfileContentProps> = ({ profileForm, onSubmit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          Profile Settings
        </CardTitle>
        <CardDescription>
          Manage your personal information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form
            onSubmit={profileForm.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={profileForm.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={profileForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled
                      className="bg-gray-50"
                    />
                  </FormControl>
                  <FormDescription>
                    Contact support to change your email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Profile</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

// Separate AI settings content into its own component
interface AISettingsContentProps {
  aiSettingsForm: any;
  onSubmit: (values: any) => Promise<void>;
}

const AISettingsContent: React.FC<AISettingsContentProps> = ({ aiSettingsForm, onSubmit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          AI Chat Settings
        </CardTitle>
        <CardDescription>
          Configure your AI assistant preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...aiSettingsForm}>
          <form
            onSubmit={aiSettingsForm.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={aiSettingsForm.control}
              name="provider"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Choose AI Provider</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="openai" id="openai" />
                        <Label htmlFor="openai">OpenAI (GPT models)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gemini" id="gemini" />
                        <Label htmlFor="gemini">Google Gemini AI</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {aiSettingsForm.watch("provider") === "openai" && (
              <FormField
                control={aiSettingsForm.control}
                name="openAiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Key className="h-4 w-4 mr-1" />
                      OpenAI API Key
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="sk-..."
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <a 
                        href="https://platform.openai.com/api-keys" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-500 flex items-center hover:underline"
                      >
                        Get your API key from OpenAI 
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {aiSettingsForm.watch("provider") === "gemini" && (
              <FormField
                control={aiSettingsForm.control}
                name="geminiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Key className="h-4 w-4 mr-1" />
                      Gemini API Key
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="AI..."
                        {...field}
                        type="password"
                      />
                    </FormControl>
                    <FormDescription className="flex items-center">
                      <a 
                        href="https://makersuite.google.com/app/apikeys" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-500 flex items-center hover:underline"
                      >
                        Get your API key from Google AI Studio
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {aiSettingsForm.watch("provider") === "openai" && (
              <FormField
                control={aiSettingsForm.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gpt-4o-mini">
                          GPT-4o Mini (Faster & Cheaper)
                        </SelectItem>
                        <SelectItem value="gpt-4o">
                          GPT-4o (More Capable)
                        </SelectItem>
                        <SelectItem value="gpt-3.5-turbo">
                          GPT-3.5 Turbo (Legacy)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={aiSettingsForm.control}
              name="temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Temperature: {field.value.toFixed(1)}
                  </FormLabel>
                  <FormDescription>
                    Lower values yield more consistent, focused responses. Higher values produce more creative, diverse outputs.
                  </FormDescription>
                  <FormControl>
                    <Slider
                      min={0}
                      max={1}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Focused (0.0)</span>
                    <span>Creative (1.0)</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={aiSettingsForm.control}
              name="maxTokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Response Length: {field.value}</FormLabel>
                  <FormDescription>
                    Maximum length of AI responses in tokens (roughly 4 characters per token)
                  </FormDescription>
                  <FormControl>
                    <Slider
                      min={100}
                      max={2000}
                      step={100}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                    />
                  </FormControl>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Shorter (100)</span>
                    <span>Longer (2000)</span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={aiSettingsForm.control}
              name="showSources"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Show Document Sources</FormLabel>
                    <FormDescription>
                      Display sources used from your documents in AI responses
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-blue-700">
                Your API key is stored securely in your browser and never sent to our servers.
              </AlertDescription>
            </Alert>

            <Button type="submit">Save AI Settings</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

// Separate security content into its own component
interface SecurityContentProps {
  securityForm: any;
  onSubmit: (values: any) => Promise<void>;
}

const SecurityContent: React.FC<SecurityContentProps> = ({ securityForm, onSubmit }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lock className="h-5 w-5 mr-2" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Change your password and security settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...securityForm}>
          <form
            onSubmit={securityForm.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={securityForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={securityForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={securityForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Update Password</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default StudentSettings;
