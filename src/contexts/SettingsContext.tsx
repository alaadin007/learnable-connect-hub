
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Define settings types
export interface Settings {
  maxTokens?: number;
  temperature?: number;
  model?: string;
  showSources?: boolean;
}

// User settings from database - define the exact structure to match DB
interface UserSettings {
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
          // Check if the user_settings table exists using a safer approach
          try {
            // Use the new function that returns properly typed data
            const { data, error } = await supabase.rpc('get_user_settings', {
              user_id_param: session.user.id
            });
            
            if (data && !error) {
              // The data from RPC is now a single row, not an array
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
          // Use the new RPC function for updating settings
          await supabase.rpc('update_user_settings', {
            user_id_param: session.user.id,
            max_tokens_param: updatedSettings.maxTokens,
            temperature_param: updatedSettings.temperature,
            model_param: updatedSettings.model,
            show_sources_param: updatedSettings.showSources
          });
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
