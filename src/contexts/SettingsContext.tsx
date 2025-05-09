
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, getApiKey, saveApiKey, getAiProvider } from '@/integrations/supabase/client';
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
    aiProvider: getAiProvider(),
    openAiKey: getApiKey('openai') || '',
    geminiKey: getApiKey('gemini') || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        // First, load from localStorage
        const localAiProvider = getAiProvider();
        const localOpenAiKey = getApiKey('openai') || '';
        const localGeminiKey = getApiKey('gemini') || '';
        
        // Update settings with localStorage values
        setSettings(prevSettings => ({
          ...prevSettings,
          aiProvider: localAiProvider,
          openAiKey: localOpenAiKey,
          geminiKey: localGeminiKey,
        }));
        
        // If user is authenticated, also try to get server-stored API keys
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            // Check if the user_api_keys table exists
            const { data, error } = await supabase
              .from('user_api_keys')
              .select('provider, api_key')
              .eq('user_id', session.user.id);
            
            if (data && !error) {
              // If server has keys and localStorage doesn't, use server keys
              const openaiKey = data.find(key => key.provider === 'openai')?.api_key || localOpenAiKey;
              const geminiKey = data.find(key => key.provider === 'gemini')?.api_key || localGeminiKey;
              
              // Only update if we got keys from server that aren't in localStorage yet
              if ((openaiKey && !localOpenAiKey) || (geminiKey && !localGeminiKey)) {
                // Save to localStorage
                if (openaiKey && !localOpenAiKey) saveApiKey('openai', openaiKey);
                if (geminiKey && !localGeminiKey) saveApiKey('gemini', geminiKey);
                
                // Update settings
                setSettings(prevSettings => ({
                  ...prevSettings,
                  aiProvider: openaiKey ? 'openai' : geminiKey ? 'gemini' : prevSettings.aiProvider,
                  openAiKey: openaiKey || localOpenAiKey,
                  geminiKey: geminiKey || localGeminiKey,
                }));
              }
            }
          } catch (dbError) {
            console.warn('User settings error:', dbError);
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
      
      // Always save API provider choice to localStorage
      if (newSettings.aiProvider) {
        saveApiKey(newSettings.aiProvider, 
          newSettings.aiProvider === 'openai' ? 
            (newSettings.openAiKey || settings.openAiKey || '') : 
            (newSettings.geminiKey || settings.geminiKey || '')
        );
      }
      
      // Save API keys to localStorage
      if (newSettings.aiProvider === 'openai' && newSettings.openAiKey) {
        saveApiKey('openai', newSettings.openAiKey);
      }
      
      if (newSettings.aiProvider === 'gemini' && newSettings.geminiKey) {
        saveApiKey('gemini', newSettings.geminiKey);
      }
      
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
