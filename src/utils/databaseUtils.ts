import { supabase } from '@/integrations/supabase/client';

// Get user profile function - handles profiles with additional fields
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_type,
        full_name,
        email,
        school_id,
        school_code,
        avatar_url,
        is_active,
        organization:schools(id, name)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    if (!data) {
      console.warn('No profile found for user:', userId);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    throw error;
  }
}

// Other utility functions can be added here
