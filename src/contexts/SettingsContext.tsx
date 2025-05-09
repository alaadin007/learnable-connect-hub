
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Define settings types
export interface Settings {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  showSources?: boolean;
  aiProvider?: 'openai' | 'gemini';
  openAiKey?: string;
  geminiKey?: string;
}

// Define context type
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<boolean>;
  isLoading: boolean;
}

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: {
    maxTokens: 400,
    temperature: 0.5,
    model: 'gpt-3.5-turbo',
    showSources: true,
    aiProvider: 'openai',
    openAiKey: '',
    geminiKey: '',
  },
  updateSettings: async () => false,
  isLoading: false,
});

// Create provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    maxTokens: 400,
    temperature: 0.5,
    model: 'gpt-3.5-turbo',
    showSources: true,
    aiProvider: 'openai',
    openAiKey: '',
    geminiKey: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from storage or database
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        // First try to get from localStorage for quick load
        const storedSettings = localStorage.getItem('user-settings');
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
        
        // Then try to get from database if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Check if the user_settings table exists using a safer approach
          try {
            // Use the new function that returns properly typed data
            const { data, error } = await supabase
              .from('user_api_keys')
              .select('provider, api_key')
              .eq('user_id', session.user.id);
            
            if (data && !error) {
              // Create settings object from user API keys
              const openaiKey = data.find(key => key.provider === 'openai')?.api_key || '';
              const geminiKey = data.find(key => key.provider === 'gemini')?.api_key || '';
              
              const dbSettings: Settings = {
                ...settings,
                aiProvider: openaiKey ? 'openai' : geminiKey ? 'gemini' : 'openai',
                openAiKey: openaiKey,
                geminiKey: geminiKey,
              };
              
              setSettings(dbSettings);
              localStorage.setItem('user-settings', JSON.stringify(dbSettings));
            }
          } catch (dbError) {
            console.warn('User settings error:', dbError);
            // Just continue with localStorage settings
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  // Function to update settings
  const updateSettings = async (newSettings: Partial<Settings>): Promise<boolean> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      
      // Store in localStorage
      localStorage.setItem('user-settings', JSON.stringify(updatedSettings));
      
      // Save to database if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // If updating AI provider or API keys, save to user_api_keys table
        if (newSettings.aiProvider === 'openai' && newSettings.openAiKey) {
          const { error } = await supabase
            .from('user_api_keys')
            .upsert({
              user_id: session.user.id,
              provider: 'openai',
              api_key: newSettings.openAiKey
            }, {
              onConflict: 'user_id,provider'
            });
            
          if (error) {
            console.error('Error saving OpenAI key:', error);
            toast.error('Failed to save OpenAI API key');
            return false;
          }
        }
        
        if (newSettings.aiProvider === 'gemini' && newSettings.geminiKey) {
          const { error } = await supabase
            .from('user_api_keys')
            .upsert({
              user_id: session.user.id,
              provider: 'gemini',
              api_key: newSettings.geminiKey
            }, {
              onConflict: 'user_id,provider'
            });
            
          if (error) {
            console.error('Error saving Gemini key:', error);
            toast.error('Failed to save Gemini API key');
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
      return false;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

// Create and export hook for using this context
export const useSettings = () => useContext(SettingsContext);
