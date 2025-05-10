
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { hasData } from '@/utils/supabaseTypeHelpers';

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
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('medium');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');

    // Load font size from localStorage
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    setFontSize(savedFontSize);
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

  const loadApiKeys = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('provider, api_key')
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error fetching API keys:", error);
        return;
      }

      if (data && Array.isArray(data)) {
        data.forEach(apiKey => {
          if (apiKey.provider === 'openai' && apiKey.api_key) {
            setOpenaiApiKey(apiKey.api_key);
          } else if (apiKey.provider === 'gemini' && apiKey.api_key) {
            setGeminiApiKey(apiKey.api_key);
          }
        });
      }
    } catch (error) {
      console.error("Failed to load API keys:", error);
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
      
      const { error } = await supabase
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
      saveApiKey
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
