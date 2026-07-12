import { SupabaseClient } from '@supabase/supabase-js';

export const tutorRepository = {
  async findByUserId(supabase: SupabaseClient, userId: string) {
    const { data, error } = await supabase
      .from('tutor_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is the PostgREST code for "No rows found"
      throw error;
    }
    return data;
  }
};
