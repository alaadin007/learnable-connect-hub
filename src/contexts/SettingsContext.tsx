
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { hasData, asId, safeApiKeyAccess } from '@/utils/supabaseTypeHelpers';

interface SettingsContextType {
  theme: string;
  toggleTheme: () => void;
  fontSize: string;
  setFontSize: (size: string) => void;
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  saveApiKey: (provider: string, key: string) => Promise<void>;
  settings: {
    maxTokens: number;
    temperature: number;
    model: string;
    showSources: boolean;
    aiProvider: string;
    openAiKey?: string;
    geminiKey?: string;
  };
  updateSettings?: (newSettings: Partial<typeof defaultSettings>) => void;
  isLoading: boolean;
}

// Default settings
const defaultSettings = {
  maxTokens: 500,
  temperature: 0.7,
  model: 'gpt-3.5-turbo',
  showSources: true,
  aiProvider: 'openai',
  openAiKey: '',
  geminiKey: ''
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');

    // Load font size from localStorage
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    setFontSize(savedFontSize);
    
    // Load settings from localStorage
    try {
      const savedSettings = localStorage.getItem('aiSettings');
      if (savedSettings) {
        setSettings({...defaultSettings, ...JSON.parse(savedSettings)});
      }
    } catch (e) {
      console.error("Failed to load saved settings:", e);
    }
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const updateSettings = (newSettings: Partial<typeof defaultSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorage.setItem('aiSettings', JSON.stringify(updatedSettings));
  };

  const loadApiKeys = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('provider, api_key')
        .eq('user_id', asId(user.id));
      
      if (error) {
        console.error("Error fetching API keys:", error);
        return;
      }

      if (data && Array.isArray(data)) {
        data.forEach(apiKeyItem => {
          const keyData = safeApiKeyAccess(apiKeyItem);
          if (keyData) {
            if (keyData.provider === 'openai' && keyData.api_key) {
              setOpenaiApiKey(keyData.api_key);
            } else if (keyData.provider === 'gemini' && keyData.api_key) {
              setGeminiApiKey(keyData.api_key);
            }
          }
        });
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveApiKey = async (provider: string, key: string) => {
    if (!user) {
      toast.error("You must be logged in to save API keys");
      return;
    }

    try {
      // Basic validation
      if (!key || key.trim().length < 10) {
        toast.error("Please enter a valid API key");
        return;
      }

      const formattedKey = key.trim();
      
      // Use our helper function from utils/supabaseTypeHelpers.ts
      const { data, error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          provider,
          api_key: formattedKey
        })
        .select();

      if (error) {
        throw error;
      }

      toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved successfully`);
      
      // Update the local state
      if (provider === 'openai') {
        setOpenaiApiKey(formattedKey);
      } else if (provider === 'gemini') {
        setGeminiApiKey(formattedKey);
      }
    } catch (error: any) {
      console.error(`Failed to save ${provider} API key:`, error);
      toast.error(`Failed to save ${provider} API key`);
    }
  };

  return (
    <SettingsContext.Provider value={{
      theme,
      toggleTheme,
      fontSize,
      setFontSize,
      openaiApiKey,
      setOpenaiApiKey,
      geminiApiKey,
      setGeminiApiKey,
      saveApiKey,
      settings,
      updateSettings,
      isLoading
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
