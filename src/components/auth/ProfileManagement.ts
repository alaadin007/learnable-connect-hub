
import { supabase } from '@/integrations/supabase/client';
import { Profile } from './types';

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    // Add organization property if school_code exists
    if (data.school_code) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, code')
        .eq('code', data.school_code)
        .single();
        
      if (schoolData) {
        return {
          ...data,
          organization: {
            id: schoolData.id,
            name: schoolData.name,
            code: schoolData.code
          }
        };
      }
    }

    return data;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
}
