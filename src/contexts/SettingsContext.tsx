
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define settings types
export interface Settings {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  showSources?: boolean;
}

// User settings from database
interface UserSettings {
  user_id: string;
  max_tokens: number;
  temperature: number;
  model: string;
  show_sources: boolean;
}

// Define context type
interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  isLoading: boolean;
}

// Create context with default values
const SettingsContext = createContext<SettingsContextType>({
  settings: {
    maxTokens: 400,
    temperature: 0.5,
    model: 'gpt-3.5-turbo',
    showSources: true,
  },
  updateSettings: () => {},
  isLoading: false,
});

// Create provider component
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    maxTokens: 400,
    temperature: 0.5,
    model: 'gpt-3.5-turbo',
    showSources: true,
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
          // We're not checking if user_settings table exists yet,
          // so we'll handle it with try/catch and fallback to localStorage settings
          try {
            // Check if the settings feature is currently available
            const { data, error } = await supabase
              .from('user_settings')
              .select('*')
              .eq('user_id', session.user.id)
              .limit(1)
              .maybeSingle();
              
            if (data && !error) {
              const dbSettings = {
                maxTokens: data.max_tokens,
                temperature: data.temperature,
                model: data.model,
                showSources: data.show_sources,
              };
              setSettings(dbSettings);
              localStorage.setItem('user-settings', JSON.stringify(dbSettings));
            }
          } catch (dbError) {
            console.warn('User settings table might not exist yet:', dbError);
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
  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Store in localStorage
    localStorage.setItem('user-settings', JSON.stringify(updatedSettings));
    
    // Save to database if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          await supabase
            .from('user_settings')
            .upsert({
              user_id: session.user.id,
              max_tokens: updatedSettings.maxTokens,
              temperature: updatedSettings.temperature,
              model: updatedSettings.model,
              show_sources: updatedSettings.showSources,
            }, { onConflict: 'user_id' });
        } catch (dbError) {
          console.warn('Failed to save settings to database:', dbError);
          // Continue normally - localStorage is our source of truth
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
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
