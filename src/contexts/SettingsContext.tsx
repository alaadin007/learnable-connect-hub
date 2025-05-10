
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { hasData } from '@/utils/supabaseTypeHelpers';

// Define the interface for user settings
export interface UserSettings {
  maxTokens: number;
  temperature: number;
  model: string;
  showSources: boolean;
  aiProvider: string;
  openAiKey?: string;
  geminiKey?: string;
}

// Define accepted AI provider types
export type AIProvider = 'openai' | 'gemini';

// Define the context type
export interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  saveApiKey: (provider: AIProvider, apiKey: string) => Promise<boolean>;
  setAIProvider: (provider: AIProvider) => void;
  saveSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  isUpdating: boolean;
}

// Create context with a default value
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Default settings
const defaultSettings: UserSettings = {
  maxTokens: 500,
  temperature: 0.7,
  model: 'gpt-3.5-turbo',
  showSources: true,
  aiProvider: 'openai',
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const { user } = useAuth();
  
  // Load settings on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadSettings();
    } else {
      setSettings(defaultSettings);
      setIsLoading(false);
    }
  }, [user?.id]);
  
  // Function to load settings from the database
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Try to get settings from local storage first as a cached version
      const cachedSettings = localStorage.getItem('userSettings');
      if (cachedSettings) {
        setSettings(JSON.parse(cachedSettings));
      }
      
      // Load API keys if available
      await loadApiKeys();
      
      // Here you would typically fetch settings from your Supabase database
      // For now, we're just using the defaults or local storage
      
      // const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
      // if (!error && data) {
      //   setSettings({
      //     ...defaultSettings,
      //     ...data
      //   });
      // }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to load API keys
  const loadApiKeys = async () => {
    if (!user?.id) return;
    
    try {
      const { data: openAiData, error: openAiError } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('provider', 'openai')
        .maybeSingle();
      
      const { data: geminiData, error: geminiError } = await supabase
        .from('user_api_keys')
        .select('api_key')
        .eq('user_id', user.id)
        .eq('provider', 'gemini')
        .maybeSingle();
      
      setSettings(prev => ({
        ...prev,
        openAiKey: hasData(openAiData) ? openAiData.api_key : undefined,
        geminiKey: hasData(geminiData) ? geminiData.api_key : undefined,
        // If we have the key for the currently selected provider, use that provider
        aiProvider: 
          (prev.aiProvider === 'openai' && hasData(openAiData)) || 
          (prev.aiProvider === 'gemini' && hasData(geminiData)) 
            ? prev.aiProvider 
            : (hasData(openAiData) ? 'openai' : (hasData(geminiData) ? 'gemini' : 'openai'))
      }));
    } catch (error) {
      console.error("Failed to load API keys:", error);
    }
  };

  // Function to save API key
  const saveApiKey = async (provider: AIProvider, apiKey: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          provider,
          api_key: apiKey
        }, { onConflict: 'user_id,provider' });

      if (error) throw error;

      // Update local state
      setSettings(prev => ({
        ...prev,
        [provider === 'openai' ? 'openAiKey' : 'geminiKey']: apiKey
      }));
      
      toast.success('API key saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  // Function to set AI provider
  const setAIProvider = (provider: AIProvider) => {
    setSettings(prev => ({
      ...prev,
      aiProvider: provider
    }));
    
    // Save to local storage
    const updatedSettings = {
      ...settings,
      aiProvider: provider
    };
    localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
  };

  // Function to save settings
  const saveSettings = async (newSettings: Partial<UserSettings>): Promise<boolean> => {
    setIsUpdating(true);
    try {
      // Update local state
      const updatedSettings = {
        ...settings,
        ...newSettings
      };
      setSettings(updatedSettings);
      
      // Save to local storage
      localStorage.setItem('userSettings', JSON.stringify(updatedSettings));
      
      // Here you would typically save to your Supabase database
      // if (user?.id) {
      //   const { error } = await supabase
      //     .from('user_settings')
      //     .upsert({
      //       user_id: user.id,
      //       ...updatedSettings
      //     });
      //   if (error) throw error;
      // }
      
      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const value: SettingsContextType = {
    settings,
    isLoading,
    saveApiKey,
    setAIProvider,
    saveSettings,
    isUpdating
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
